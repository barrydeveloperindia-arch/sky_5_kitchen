/**
 * HOTEL SKY 5 - SHARED INVENTORY STORE (Firebase)
 * All devices read/write the same Firestore data in real time. Opens straight away (no PIN):
 * each device signs in anonymously. Entries are never hard-deleted - "delete" only hides them,
 * so a wrong or malicious delete can always be recovered from the database.
 * E2E tests set VITE_FIREBASE_EMULATOR=1 so they never touch live data.
 */
import { useEffect, useState, useCallback } from 'react';
import {
    collection, doc, addDoc, updateDoc, setDoc, onSnapshot, query, orderBy, serverTimestamp, deleteField,
} from 'firebase/firestore';
import { getServices, whenSignedIn } from './firebase';
import { trackWrite } from './syncedState';

const TX = 'inventory_transactions';
const SETTINGS = 'inventory_settings';
const SETTINGS_DOC = 'config';

export function useInventoryStore() {
    const [user, setUser] = useState(undefined); // undefined = connecting
    const [data, setData] = useState({ transactions: [], minLevels: {}, conditions: {}, loaded: false });
    const [syncError, setSyncError] = useState('');

    useEffect(() => {
        let alive = true;
        whenSignedIn().then(u => { if (alive) setUser(u); }).catch(() => { if (alive) setSyncError('No internet connection.'); });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!user) return undefined;
        const { db } = getServices();
        let txLoaded = false;
        let setLoaded = false;
        const markLoaded = () => { if (txLoaded && setLoaded) setData(d => ({ ...d, loaded: true })); };
        const unsubTx = onSnapshot(query(collection(db, TX), orderBy('createdAt', 'desc')), snap => {
            txLoaded = true;
            const all = snap.docs.map(x => ({ id: x.id, ...x.data({ serverTimestamps: 'estimate' }) }));
            setData(d => ({ ...d, transactions: all.filter(t => !t.deleted) }));
            markLoaded();
            setSyncError('');
        }, () => setSyncError('Could not load entries. Check internet.'));
        const unsubSet = onSnapshot(doc(db, SETTINGS, SETTINGS_DOC), snap => {
            setLoaded = true;
            const s = snap.data() || {};
            setData(d => ({ ...d, minLevels: s.minLevels || {}, conditions: s.conditions || {} }));
            markLoaded();
        }, () => setSyncError('Could not load settings.'));
        return () => { unsubTx(); unsubSet(); };
    }, [user]);

    const addTransaction = useCallback((entry) => trackWrite(addDoc(collection(getServices().db, TX), { ...entry, createdAt: serverTimestamp() })), []);
    // Soft delete: hidden everywhere, kept in the database for recovery
    const deleteTransaction = useCallback((id) => trackWrite(updateDoc(doc(getServices().db, TX, id), { deleted: true, deletedAt: serverTimestamp() })), []);
    // value null = clear the override (falls back to DEFAULT_MIN_LEVEL)
    const setMinLevel = useCallback((code, value) => trackWrite(setDoc(doc(getServices().db, SETTINGS, SETTINGS_DOC), { minLevels: { [code]: value === null ? deleteField() : value } }, { merge: true })), []);
    const setCondition = useCallback((code, value) => trackWrite(setDoc(doc(getServices().db, SETTINGS, SETTINGS_DOC), { conditions: { [code]: value } }, { merge: true })), []);

    return {
        status: user === undefined ? 'connecting' : data.loaded ? 'ready' : 'loading',
        data, syncError,
        addTransaction, deleteTransaction, setMinLevel, setCondition,
    };
}
