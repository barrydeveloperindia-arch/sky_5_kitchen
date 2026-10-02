/**
 * HOTEL SKY 5 - live, shared state backed by Firestore.
 *
 * useSyncedCollection(name, seed) works like useState for an array of { id, ... } records:
 *   const [rooms, setRooms, ready] = useSyncedCollection('hotel_rooms', seedRooms);
 *   setRooms(prev => prev.map(...))   // same updater style as useState
 * { newestFirst: true } keeps new records on top (logs, orders), like [newItem, ...prev].
 * Each record is its own document, and only the fields this device changed are written, so two
 * devices editing the same room (food bill vs. cleaning status) never overwrite each other.
 * The seed is written once, the first time the collection is ever opened (marked in hotel_meta).
 *
 * useSyncedDoc(key, seed) does the same for a single value (e.g. the staff registry); for a map
 * value only the changed keys are written.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, deleteField, doc, FieldPath, getDoc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore';
import { getServices, whenSignedIn } from './firebase';

const META = 'hotel_meta';
const STATE = 'hotel_state';

// ---- how many saves are still on their way to the database (for "Saving…" and tab-close warning)
let pendingWrites = 0;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn(pendingWrites));
// The last save that failed stays visible until someone dismisses it (a rejected write is
// rolled back by Firestore, so without this the change would silently disappear).
let lastError = '';
const errorListeners = new Set();
export function reportSyncError(message) { lastError = message; errorListeners.forEach(fn => fn(lastError)); }
export function clearSyncError() { reportSyncError(''); }
export function trackWrite(promise) {
    pendingWrites += 1;
    notify();
    return promise
        .catch(err => { reportSyncError('A change could NOT be saved. Check internet and do it again.'); throw err; })
        .finally(() => { pendingWrites -= 1; notify(); });
}
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', (e) => {
        if (pendingWrites > 0) { e.preventDefault(); e.returnValue = ''; }
    });
}
// A change queued before the first snapshot also counts as unsaved until it is written
function queuedWrite() {
    let done;
    trackWrite(new Promise(res => { done = res; })).catch(() => {});
    return () => done();
}

export function useSyncStatus() {
    const [pending, setPending] = useState(pendingWrites);
    useEffect(() => { listeners.add(setPending); return () => listeners.delete(setPending); }, []);
    return pending;
}

// Is this device online? (navigator.onLine + online/offline events). Offline changes are kept on
// the device by Firestore and sync automatically when the internet returns.
export function useOnline() {
    const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);
    return online;
}

export function useSyncError() {
    const [error, setError] = useState(lastError);
    useEffect(() => { errorListeners.add(setError); return () => errorListeners.delete(setError); }, []);
    return error;
}

// Firestore rejects `undefined`; drop those keys (deeply) before writing
export function toFirestore(value) {
    if (Array.isArray(value)) return value.map(toFirestore);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const out = {};
        for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = toFirestore(v);
        return out;
    }
    return value;
}

// Which records to write / delete to turn `prev` into `next` (compared by id + object identity).
// A repeated id in `next` is ignored (first one wins), so two records never fight over one doc.
export function diffById(prev, next) {
    const before = new Map(prev.map(r => [String(r.id), r]));
    const seen = new Set();
    const upserts = [];
    for (const r of next) {
        const key = String(r.id);
        if (seen.has(key)) continue;
        seen.add(key);
        if (before.get(key) !== r) upserts.push(r);
        before.delete(key);
    }
    return { upserts, deletes: [...before.keys()] };
}

// Only the top-level fields that differ (a removed field comes back as undefined)
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
export function changedFields(before, after) {
    const out = {};
    for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (!same(before[k], after[k])) out[k] = after[k];
    }
    return out;
}

// { field: value } -> Firestore data + the exact field paths to replace (removed fields are deleted)
function fieldWrite(fields, prefix) {
    const data = {};
    const target = prefix ? (data[prefix] = {}) : data;
    for (const [k, v] of Object.entries(fields)) target[k] = v === undefined ? deleteField() : toFirestore(v);
    const paths = Object.keys(fields).map(k => (prefix ? new FieldPath(prefix, k) : new FieldPath(k)));
    return [data, { mergeFields: paths }];
}

export function useSyncedCollection(name, seed, { newestFirst = false } = {}) {
    const seedRef = useRef(seed);
    const [items, setItems] = useState(seed);
    const itemsRef = useRef(seed);
    const [ready, setReady] = useState(false);
    const readyRef = useRef(false);
    // Changes made before the first server snapshot are replayed on the real data once it
    // arrives, so an early click can never replace the shared list with the local seed.
    const pendingRef = useRef([]);
    const [error, setError] = useState('');

    const commit = useCallback((prev, next) => {
        // Records are never hard-deleted (the rules forbid it), so a removal is not written.
        const { upserts } = diffById(prev, next);
        if (!upserts.length) return prev;
        const before = new Map(prev.map(r => [String(r.id), r]));
        // keep a stable position for new records: newest gets the next _order
        let maxOrder = Math.max(0, ...prev.map(r => r._order ?? 0));
        const stamped = new Map(upserts.map(r => [r, r._order === undefined ? { ...r, _order: ++maxOrder } : r]));
        const seen = new Set();
        const finalList = next
            .map(r => stamped.get(r) || r)
            .filter(r => { const k = String(r.id); if (seen.has(k)) return false; seen.add(k); return true; });
        const { db } = getServices();
        const batch = writeBatch(db);
        let writes = 0;
        for (const r of stamped.values()) {
            const ref = doc(db, name, String(r.id));
            const old = before.get(String(r.id));
            if (!old) { batch.set(ref, toFirestore(r)); writes++; continue; }
            const fields = changedFields(old, r);
            if (Object.keys(fields).length) { batch.set(ref, ...fieldWrite(fields)); writes++; }
        }
        if (writes) trackWrite(batch.commit()).catch(() => setError('Could not save. Check internet.'));
        return finalList;
    }, [name]);

    useEffect(() => {
        let unsub = () => {};
        let alive = true;
        const pending = pendingRef.current;
        let seq = 0; // a slow (awaiting) older snapshot must never overwrite a newer one
        whenSignedIn().then(() => {
            if (!alive) return;
            const { db } = getServices();
            unsub = onSnapshot(collection(db, name), async snap => {
                const mine = ++seq;
                if (snap.empty && !snap.metadata.fromCache) {
                    const meta = await getDoc(doc(db, META, name));
                    if (!meta.exists()) {
                        const batch = writeBatch(db);
                        const n = seedRef.current.length;
                        seedRef.current.forEach((r, i) => batch.set(doc(db, name, String(r.id)), toFirestore({ ...r, _order: newestFirst ? n - i : i })));
                        batch.set(doc(db, META, name), { seededAt: Date.now() });
                        await batch.commit();
                        // with records, the snapshot fires again; an empty seed has nothing to wait for
                        if (seedRef.current.length) return;
                    }
                    if (mine !== seq || !alive) return;
                }
                let list = snap.docs.map(d => d.data());
                list.sort((a, b) => newestFirst ? (b._order ?? 0) - (a._order ?? 0) : (a._order ?? 0) - (b._order ?? 0));
                if (!readyRef.current) {
                    readyRef.current = true;
                    for (const { updater, done } of pendingRef.current.splice(0)) {
                        list = commit(list, typeof updater === 'function' ? updater(list) : updater);
                        done();
                    }
                }
                itemsRef.current = list;
                setItems(list);
                setReady(true);
                setError('');
            }, () => setError('Live sync unavailable. Check internet.'));
        }).catch(() => setError('Live sync unavailable. Check internet.'));
        return () => {
            alive = false;
            unsub();
            // never leave "Saving…" stuck if the screen closes before the data loaded
            for (const p of pending.splice(0)) p.done();
        };
    }, [name, newestFirst, commit]);

    const update = useCallback((updater) => {
        const prev = itemsRef.current;
        if (!readyRef.current) {
            // show it now, save it once the real data has loaded
            pendingRef.current.push({ updater, done: queuedWrite() });
            itemsRef.current = typeof updater === 'function' ? updater(prev) : updater;
            setItems(itemsRef.current);
            return;
        }
        const next = commit(prev, typeof updater === 'function' ? updater(prev) : updater);
        if (next === prev) return;
        itemsRef.current = next;
        setItems(next); // optimistic; the snapshot confirms
    }, [commit]);

    return [items, update, ready, error];
}

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);

// For a map value (menuOverrides, staffRegistry) write only the keys that changed, so the owner
// editing item X on a phone and a manager editing item Y on the PC both survive.
function writeDocValue(db, key, prev, next) {
    const ref = doc(db, STATE, key);
    if (!isMap(prev) || !isMap(next)) { trackWrite(setDoc(ref, { value: toFirestore(next) })).catch(() => {}); return; }
    const fields = changedFields(prev, next);
    if (!Object.keys(fields).length) return;
    trackWrite(setDoc(ref, ...fieldWrite(fields, 'value'))).catch(() => {});
}

export function useSyncedDoc(key, seed) {
    const seedRef = useRef(seed);
    const [value, setValue] = useState(seed);
    const valueRef = useRef(seed);
    const [ready, setReady] = useState(false);
    const readyRef = useRef(false);
    const pendingRef = useRef([]);

    useEffect(() => {
        let unsub = () => {};
        let alive = true;
        const pending = pendingRef.current;
        whenSignedIn().then(() => {
            if (!alive) return;
            const { db } = getServices();
            unsub = onSnapshot(doc(db, STATE, key), snap => {
                if (!snap.exists()) {
                    if (!snap.metadata.fromCache) setDoc(doc(db, STATE, key), { value: toFirestore(seedRef.current) });
                    return;
                }
                let value = snap.data().value;
                if (!readyRef.current) {
                    readyRef.current = true;
                    const pending = pendingRef.current.splice(0);
                    if (pending.length) {
                        const server = value;
                        for (const { updater: u } of pending) value = typeof u === 'function' ? u(value) : u;
                        writeDocValue(db, key, server, value);
                        pending.forEach(p => p.done());
                    }
                }
                valueRef.current = value;
                setValue(value);
                setReady(true);
            });
        });
        return () => { alive = false; unsub(); for (const p of pending.splice(0)) p.done(); };
    }, [key]);

    const update = useCallback((updater) => {
        const prev = valueRef.current;
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (next === prev) return;
        valueRef.current = next;
        setValue(next);
        if (!readyRef.current) { pendingRef.current.push({ updater, done: queuedWrite() }); return; }
        writeDocValue(getServices().db, key, prev, next);
    }, [key]);

    return [value, update, ready];
}
