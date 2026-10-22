import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { BadgeCheck, Camera, CheckCircle2, ChevronLeft, Clock, KeyRound, LogIn, LogOut, RefreshCw, ScanFace, Search, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getServices, whenSignedIn } from '../lib/firebase';
import { normalizeRegistry } from '../lib/staff';
import { toFirestore, trackWrite, useOnline } from '../lib/syncedState';
import PinDialog from './ops/PinDialog';
import { verifyPin } from '../lib/staffPin';
import { speakAttendance, speakFailed, unlockSound } from '../lib/voice';
import { FACES, faceSet, findFaces, faceQuality, identifyIn, preparePhotoFaces, registeredFace, registeredPhoto, registerFace, otherFace, warmUpFaces, learnFace, nearest } from '../lib/faceMatch';
import {
    dayKey, isoDate, staffNames, hotelCheck, formatDistance, findActiveLog, pressDecision, timeLabel, tapUpdate, logIdFor, toLoc, workedHours, formatHours,
    MAX_PHOTO_CHARS,
} from '../lib/staffAttendance';

/**
 * HOTEL SKY 5 - staff attendance terminal (like the AuraLock face terminal in the office).
 * Staff only check in / out: press CHECK IN or CHECK OUT, look at the camera, the face says who it is.
 * Nothing about the staff list can be changed here - the manager does that in OPS Center -> Workforce.
 * If the face is not recognised: try again, or the person's PIN (the same as in TimeStation).
 */
const DEPTS = [['reception', 'Front Desk & Management'], ['kitchen', 'Kitchen'], ['housekeeping', 'Housekeeping']];
const NO_NET = 'No internet. Connect and open the link again.';
const DONE_SECONDS = 10;          // the result screen goes back to the start by itself
const NOTE_SECONDS = 6;           // a short note (already checked in...) disappears by itself
// The camera scans by itself as soon as it opens (no countdown, no button), like the AuraLock terminal:
const AGREE_FRAMES = 2;           // the same person recognised in 2 frames = done (about 1-2 s on a phone)
const UNKNOWN_FRAMES = 6;         // clear frames of a face nobody registered: then "not recognised"
const SCAN_TIMEOUT_MS = 12000;    // nobody usable in front of the camera for this long: the camera closes
const FRAME_GAP_MS = 60;          // a short breath between frames (keeps the phone cool)
const CAMERA_WAIT_MS = 6000;      // a camera that has not started by then is asked again
const LOC_FRESH_MS = 120000;      // a location found on the start screen is used if it is this recent
const LEARN_LIMIT = 0.7;          // a PIN entry teaches the face only if it still resembles the person's own face
const PHOTO_FRESH_MS = 60000;     // a PIN entry uses the camera photo only if it was taken this recently
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

// The camera frame at full size, for the face check (a small photo loses face detail)
function fullFrame(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas;
}

// Front camera frame -> small JPEG (data URL) that fits the database limit
function snap(video) {
    const w = 360;
    const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    for (const q of [0.7, 0.55, 0.4, 0.3]) {
        const url = canvas.toDataURL('image/jpeg', q);
        if (url.length <= MAX_PHOTO_CHARS) return url;
    }
    return null;
}

// Phone location (best effort, up to 10 s). Resolves { loc } or { error }.
function locate() {
    return new Promise(resolve => {
        if (!navigator.geolocation) { resolve({ error: 'This phone has no location.' }); return; }
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ loc: toLoc(pos) }),
            err => resolve({ error: err.code === 1 ? 'Location permission was not given.' : 'Location could not be found.' }),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    });
}

const has = (v) => !!v && v !== '--';

export default function StaffAttendance() {
    const [registry, setRegistry] = useState(null);
    const [logs, setLogs] = useState([]);
    const [ready, setReady] = useState(false);
    const [step, setStep] = useState('home');      // home | camera | saving | done
    const [kind, setKind] = useState(null);        // the button pressed: 'in' | 'out'
    const [failed, setFailed] = useState(null);    // { msg } the face did not work: Try again / Use PIN
    const [note, setNote] = useState(null);        // { name, msg } e.g. "already checked in" - no new entry
    const [result, setResult] = useState(null);
    const [refPhoto, setRefPhoto] = useState(null);   // the registered photo shown beside the live one
    const [picking, setPicking] = useState(false);    // "Use PIN": choose your name
    const [search, setSearch] = useState('');
    const [pinAsk, setPinAsk] = useState(null);       // { rec } while the PIN is asked
    const [now, setNow] = useState(() => Date.now());
    const [scanMsg, setScanMsg] = useState('');      // what the camera sees right now (e.g. "Come closer")
    const online = useOnline();
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const locRef = useRef(null);
    const facesRef = useRef(new Map());   // every registered face, kept live on the phone (scan without network)
    const staffRef = useRef([]);
    const locCache = useRef(null);       // { at, value } a location found while on the start screen
    const runRef = useRef(0);   // changes on every new press / cancel: a scan that was cancelled must not save anything
    const lastRef = useRef({ photo: null, face: null, at: 0 });   // the last camera photo + its face (for a PIN entry right after)
    const today = dayKey(new Date(now));
    const yesterday = dayKey(new Date(now - 86400000));

    // Staff list + today's (and last night's) register rows, live. Read only: this page never edits the registry.
    useEffect(() => {
        const unsubs = [];
        let alive = true;
        whenSignedIn().then(() => {
            if (!alive) return;
            const { db } = getServices();
            unsubs.push(onSnapshot(doc(db, 'hotel_state', 'staffRegistry'), s => setRegistry(normalizeRegistry(s.exists() ? s.data().value : {})),
                () => setFailed({ msg: NO_NET })));
            unsubs.push(onSnapshot(collection(db, FACES), s => {
                const m = new Map();
                for (const d of s.docs) { const rec = d.data(); if (faceSet(rec).length) m.set(d.id, rec); }
                facesRef.current = m;
            }, () => {}));
            unsubs.push(onSnapshot(query(collection(db, 'hotel_attendance'), where('date', 'in', [today, yesterday])), s => {
                setLogs(s.docs.map(d => d.data()));
                setReady(true);
            }, () => setFailed({ msg: NO_NET })));
        });
        return () => { alive = false; unsubs.forEach(u => u()); };
    }, [today, yesterday]);

    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
    useEffect(() => stopCamera, []);
    // the face check is slow the first time on a phone: get it ready on the start screen
    useEffect(() => {
        if (step !== 'home') return undefined;
        const t = setTimeout(() => { warmUpFaces().catch(() => {}); }, 1200);
        // know where the phone is before anybody presses a button (saving then never waits for GPS)
        const fetchLoc = () => locate().then(v => { if (v.loc) locCache.current = { at: Date.now(), value: v }; });
        fetchLoc();
        const l = setInterval(fetchLoc, 90000);
        return () => { clearTimeout(t); clearInterval(l); };
    }, [step]);

    const staff = registry ? staffNames(registry) : [];
    useEffect(() => { staffRef.current = staff; preparePhotoFaces(facesRef.current, staff).catch(() => {}); });
    const deptLabel = (dept) => DEPTS.find(([k]) => k === dept)?.[1] || '';
    // who is in right now (today's rows plus a night shift still open)
    const present = staff.filter(s => { const l = findActiveLog(logs, s, new Date(now)); return l && has(l.checkIn) && !has(l.checkOut); }).length;
    const left = staff.filter(s => { const l = findActiveLog(logs, s, new Date(now)); return l && has(l.checkOut); }).length;
    const clock = new Date(now);

    const goHome = () => { setResult(null); setRefPhoto(null); setStep('home'); };
    useEffect(() => {
        if (step !== 'done') return undefined;
        const t = setTimeout(goHome, DONE_SECONDS * 1000);
        return () => clearTimeout(t);
    }, [step]);
    useEffect(() => {
        if (!note) return undefined;
        const t = setTimeout(() => setNote(null), NOTE_SECONDS * 1000);
        return () => clearTimeout(t);
    }, [note]);

    // Put the camera on screen once the video box exists
    useEffect(() => {
        const video = videoRef.current, stream = streamRef.current;
        if (step !== 'camera' || !video || !stream || video.srcObject === stream) return;
        video.srcObject = stream;
        video.play().catch(() => {});
    }, [step]);

    const press = async (k) => {
        unlockSound();
        setFailed(null); setNote(null);
        setKind(k);
        runRef.current += 1;
        setScanMsg('');
        lastRef.current = { photo: null, face: null, at: 0 };
        // a recent location from the start screen at once; a fresh one is asked for as well
        const cached = locCache.current && Date.now() - locCache.current.at < LOC_FRESH_MS ? locCache.current.value : null;
        const fresh = locate();
        locRef.current = cached ? Promise.race([fresh, sleep(1500).then(() => cached)]) : fresh;
        warmUpFaces().catch(() => {});
        const run = runRef.current;
        // a camera that does not answer is asked once more; if it still does not start, say so (never wait silently)
        const open = () => new Promise((resolve, reject) => {
            const late = setTimeout(() => reject(new Error('timeout')), CAMERA_WAIT_MS);
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false })
                .then(s => { clearTimeout(late); if (run !== runRef.current) { s.getTracks().forEach(t => t.stop()); reject(new Error('cancelled')); } else resolve(s); },
                    e => { clearTimeout(late); reject(e); });
        });
        try {
            let stream;
            try { stream = await open(); } catch (e) { if (e?.message !== 'timeout') throw e; stream = await open(); }
            streamRef.current = stream;
            setStep('camera');
        } catch (e) {
            if (e?.message === 'cancelled') return;
            setFailed({ msg: e?.message === 'timeout' ? 'Camera did not start. Close other camera apps and try again.' : 'Camera permission is needed. Allow the camera for this app and try again.' });
        }
    };
    const cancel = () => { runRef.current += 1; stopCamera(); setStep('home'); };
    // the face did not work: close the camera, say so, offer Try again / PIN
    const fail = (msg) => { runRef.current += 1; stopCamera(); setStep('home'); speakFailed(); setFailed({ msg, face: true }); };


    // Save one tap for this person: the photo, the row, and (PIN + no face yet) their face
    const saveTap = async (person, photo, face, register) => {
        setStep('saving');
        const { loc, error: locError } = await (locRef.current || locate());
        const at = new Date();
        const who = { name: person.name, staffId: person.staffId };
        const row0 = findActiveLog(logs, who, at);
        const d = pressDecision(row0, kind || 'in', at.getTime());
        if (d.msg) { setNote({ name: person.name, msg: d.msg }); setStep('home'); return; }
        const go = d.go;   // 'in' | 'back' | 'out'
        const id = row0 ? String(row0.id) : logIdFor(person.name, isoDate(at));
        const photoId = photo ? `${id}-${go}-${at.getTime()}` : null;
        const fields = tapUpdate(row0, go, { at, photoId, loc });
        if (go === 'back') fields.backs[fields.backs.length - 1].face = face;
        else fields[go === 'in' ? 'inFace' : 'outFace'] = face;
        if (!loc) fields[go === 'out' ? 'outLocError' : go === 'in' ? 'inLocError' : 'backLocError'] = locError;
        if (person.staffId) fields.staffId = person.staffId;
        fields.staffName = person.name;
        const row = row0 ? fields : { id, staffName: person.name, date: dayKey(at), dateISO: isoDate(at), checkOut: '--', _order: at.getTime(), ...fields };
        try {
            const { db } = getServices();
            // a "back in" photo is a check-in photo (the photo store knows only in / out)
            if (photo) await trackWrite(setDoc(doc(db, 'hotel_attendance_photos', photoId), { logId: id, kind: go === 'out' ? 'out' : 'in', staffName: person.name, at: at.toISOString(), data: photo }));
            if (register) await registerFace(person, register, photoId);
            await trackWrite(setDoc(doc(db, 'hotel_attendance', id), toFirestore(row), { merge: true }));
            const saved = { ...(row0 || {}), ...row };
            setResult({
                kind: go, name: person.name, staffId: person.staffId, role: person.role, dept: deptLabel(person.dept), photo, loc, locError, face, registered: !!register,
                at: at.toISOString(), time: go === 'in' ? saved.checkIn : go === 'back' ? timeLabel(at) : saved.checkOut,
                checkIn: saved.checkIn, checkOut: saved.checkOut, hours: workedHours(saved),
            });
            setRefPhoto(null);
            if (face?.check === 'matched') registeredPhoto(person).then(setRefPhoto).catch(() => {});
            setStep('done');
            speakAttendance(person.name, go);
        } catch {
            setFailed({ msg: 'Could not save. Check internet and try again.' });
            setStep('home');
        }
    };

    // The scan: frames one after another while the camera is open; the same person in AGREE_FRAMES frames = done.
    // Faces are compared on the phone (live list), so a frame takes only the face engine's time.
    useEffect(() => {
        if (step !== 'camera') return undefined;
        const run = runRef.current;
        let stopped = false;
        const alive = () => !stopped && run === runRef.current;
        (async () => {
            const t0 = Date.now();
            const hits = new Map();   // name -> { n, best, photo }
            let unknown = 0, why = 'Look straight at the camera in good light.';
            while (alive()) {
                const video = videoRef.current;
                if (!video?.videoWidth) { await sleep(80); continue; }
                if (Date.now() - t0 > SCAN_TIMEOUT_MS) { fail(why); return; }
                const frame = fullFrame(video);
                let faces;
                try { faces = await findFaces(frame); } catch { if (alive()) fail('Face check could not start. Check internet and try again.'); return; }
                if (!alive()) return;
                const q = faceQuality(faces, frame.width);
                if (!q.ok) { why = q.reason; setScanMsg(q.reason); hits.clear(); await sleep(FRAME_GAP_MS * 2); continue; }
                const live = q.face.descriptor;
                const shot = snap(video);
                if (shot) lastRef.current = { photo: shot, face: faceQuality(faces, frame.width, { register: true }).ok ? live : null, at: Date.now() };
                const r = identifyIn(facesRef.current, live, staffRef.current);
                if (!r.staff) {
                    hits.clear();
                    if (r.unsure || r.near) { why = 'Hold still, come closer and look straight at the camera.'; setScanMsg(why); }
                    else if (++unknown >= UNKNOWN_FRAMES) { fail('Face not recognised. Look straight at the camera in good light and try again - or use your PIN.'); return; }
                    else setScanMsg('Face not recognised - look straight at the camera.');
                    await sleep(FRAME_GAP_MS);
                    continue;
                }
                const prev = hits.get(r.staff.name);
                if (!prev) hits.clear();   // another person than in the last frame: start counting again
                const h = prev || { n: 0, best: null, photo: null };
                h.n += 1;
                if (!h.best || r.distance < h.best.distance) { h.best = r; h.photo = shot; }
                hits.set(r.staff.name, h);
                if (h.n >= AGREE_FRAMES) {
                    stopCamera();
                    await saveTap(h.best.staff, h.photo, { check: 'matched', distance: h.best.distance, source: h.best.source }, null);
                    return;
                }
                setScanMsg('Identifying…');
                await sleep(FRAME_GAP_MS);
            }
        })();
        return () => { stopped = true; };
    }, [step]);   // eslint-disable-line react-hooks/exhaustive-deps

    // "Use PIN": choose your name, type your PIN. No face registered yet + a clear photo = the face is registered too.
    const pinFor = (rec) => { setPicking(false); setSearch(''); locRef.current = locate(); setPinAsk({ rec }); };   // a fresh location for this entry
    const afterPin = async (rec) => {
        setPinAsk(null);
        setFailed(null);
        // only a photo from the last minute belongs to the person typing the PIN now
        const fresh = Date.now() - lastRef.current.at < PHOTO_FRESH_MS;
        const { photo, face: live } = fresh ? lastRef.current : { photo: null, face: null };
        let register = null, learned = false;
        if (live) {
            try {
                const [mine, other] = await Promise.all([registeredFace(rec), otherFace(live, rec)]);
                if (!mine && !other) register = live;
                // already registered, but the face was not recognised: learn how they look now (AuraLock-style),
                // only if it still resembles their own face and is not closer to anyone else
                const own = mine ? nearest(live, mine) : Infinity;
                if (mine && own <= LEARN_LIMIT && (!other || own < other.distance)) learned = !!(await learnFace(rec, live));
            } catch { /* only the check-in then */ }
        }
        await saveTap(rec, photo, { check: 'pin', ...(learned ? { learned: true } : {}) }, register);
    };
    const pinList = staff.filter(s => s.name.toLowerCase().includes(search.trim().toLowerCase()));
    const pinRecord = (s) => (registry ? ['reception', 'kitchen', 'housekeeping'].flatMap(d => registry[d] || []).find(x => x?.name === s.name) : null);

    const how = (r) => (r.face?.check === 'matched' ? 'Face verified ✓' : r.registered ? 'Checked with your PIN ✓ · face registered' : r.face?.learned ? 'Checked with your PIN ✓ · face updated' : 'Checked with your PIN ✓');

    return (
        <div className="ui min-h-dvh bg-[#06101f] text-white" data-testid="staff-attendance">
            <style>{'@keyframes att-scan{0%,100%{top:18%}50%{top:78%}}@keyframes att-pop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes att-bar{from{width:100%}to{width:0}}'}</style>

            {/* ---------- top bar (a div, not <header>: the shop's global header style must not apply here) ---------- */}
            {step !== 'camera' && (
                <div role="banner" className="border-b border-white/10 bg-[#0a192f]">
                    <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 land:py-2">
                        <a href="/" data-testid="att-back" aria-label="Back to the hotel app"
                            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 text-white transition-colors hover:border-[#d4af37] hover:text-[#d4af37]">
                            <ChevronLeft aria-hidden className="size-5" />
                        </a>
                        <div aria-hidden className="shrink-0 rounded-lg border border-[#d4af37]/60 px-2 py-1 text-center font-serif leading-none text-[#d4af37]">
                            <div className="text-[6px] font-semibold tracking-[0.25em] text-white">HOTEL</div><div className="text-sm font-black">SKY 5</div>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] leading-tight font-bold">Staff Attendance</div>
                            <div data-testid="att-subtitle" className="truncate text-[11px] leading-tight text-[#aab4cf]">Hotel Sky 5 · Panchkula</div>
                        </div>
                        <span data-testid="att-online" title={online ? 'Connected' : 'No internet'} className={cn('flex shrink-0 items-center gap-1.5 text-[11px] font-semibold', online ? 'text-emerald-300' : 'text-red-300')}>
                            <span className={cn('size-2 rounded-full', online ? 'animate-pulse bg-emerald-400' : 'bg-red-400')} />{online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            )}

            {/* ---------- start screen: clock + the two buttons ---------- */}
            {(step === 'home' || step === 'saving') && (
                <main className="mx-auto flex min-h-[calc(100dvh-3.75rem)] max-w-5xl flex-col items-center justify-center gap-7 px-4 py-6 land:flex-row land:gap-10 land:py-3">
                    <div className="text-center land:flex-1">
                        <div aria-hidden className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37] land:mb-2 land:size-12"><ScanFace className="size-9 land:size-7" /></div>
                        <div className="text-[3.25rem] leading-none font-black tracking-tight tabular-nums min-[380px]:text-6xl land:text-5xl" data-testid="att-clock">
                            {clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s?(AM|PM)$/, '')}
                            <span className="ml-1 text-2xl text-[#d4af37]">:{String(clock.getSeconds()).padStart(2, '0')}</span>
                            <span className="ml-2 text-xl font-black text-[#d4af37]">{clock.getHours() < 12 ? 'AM' : 'PM'}</span>
                        </div>
                        <div className="mt-2 text-xs font-black tracking-[0.25em] text-[#aab4cf] uppercase">{clock.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        <div className="mt-5 flex justify-center gap-2 text-xs font-bold land:mt-3" data-testid="att-counts">
                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300">{present} in now</span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[#cdd5ea]">{left} left</span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[#cdd5ea]">{staff.length} staff</span>
                        </div>
                    </div>

                    <div className="w-full max-w-md land:flex-1">
                        {failed ? (
                            <div data-testid="att-face-failed" role="alert" className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 p-4">
                                <div className="flex items-center gap-2 text-base font-black text-red-200"><XCircle className="size-5" />{failed.face ? 'Face not recognised' : 'Not saved'}</div>
                                <p data-testid="att-error" className="mt-1 text-sm text-red-100">{failed.msg}</p>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <Button variant="outline" onClick={() => press(kind || 'in')} data-testid="att-try-again" className="h-11 rounded-xl border-white/25 bg-transparent font-bold text-white hover:bg-white/10"><RefreshCw />Try again</Button>
                                    <Button onClick={() => setPicking(true)} data-testid="att-use-pin" className="h-11 rounded-xl bg-[#d4af37] font-black text-[#0a192f] hover:bg-[#e6c65c]"><KeyRound />Use PIN</Button>
                                </div>
                                <button type="button" onClick={() => setFailed(null)} className="mt-2 w-full text-center text-xs font-semibold text-red-100/80 underline-offset-4 hover:underline">Close</button>
                            </div>
                        ) : note ? (
                            <div data-testid="att-notice" role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-300/30 bg-sky-400/10 p-4">
                                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d4af37] text-sm font-black text-[#0a192f]">{initials(note.name)}</span>
                                <div className="min-w-0"><div className="font-black text-white">{note.name}</div><div className="text-sm text-sky-100">{note.msg}</div></div>
                            </div>
                        ) : (
                            <p className="mb-4 text-center text-sm font-semibold text-[#cdd5ea]">Tap your button and look at the camera</p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            {[['in', 'CHECK IN'], ['out', 'CHECK OUT']].map(([k, label]) => (
                                <button key={k} type="button" data-testid={`att-${k}`} disabled={!ready || step === 'saving'} onClick={() => press(k)}
                                    className={cn('flex h-36 flex-col items-center justify-center gap-2 rounded-3xl text-base font-black tracking-wider transition-transform active:scale-95 disabled:opacity-40 land:h-28',
                                        k === 'in' ? 'bg-gradient-to-br from-[#e6c65c] to-[#c9a227] text-[#0a192f] shadow-lg shadow-[#d4af37]/20' : 'border-2 border-[#d4af37]/60 bg-[#0f2140] text-white')}>
                                    {k === 'in' ? <LogIn className="size-9" /> : <LogOut className="size-9" />}{label}
                                </button>
                            ))}
                        </div>
                        {step === 'saving' && <div data-testid="att-saving" className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-[#d4af37]"><RefreshCw className="size-4 animate-spin" />Saving…</div>}
                        {!ready && <p className="mt-4 text-center text-xs text-[#aab4cf]">Loading…</p>}
                        <button type="button" onClick={() => setPicking(true)} data-testid="att-pin-link" disabled={!ready}
                            className="mx-auto mt-5 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#e6c65c] underline-offset-4 hover:underline land:mt-3">
                            <KeyRound className="size-3.5" />Face not working? Use your PIN
                        </button>
                        <p className="mt-2 text-center text-[11px] text-[#8f9bb8]">Photo + location are saved with every entry. Staff changes: manager, OPS Center.</p>
                    </div>
                </main>
            )}

            {/* ---------- camera: full screen, like a face terminal ---------- */}
            {step === 'camera' && (
                <section className="fixed inset-0 z-40 bg-black" aria-label="Face scan">
                    <video ref={videoRef} data-testid="att-video" playsInline muted className="absolute inset-0 size-full -scale-x-100 object-cover" />
                    <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 aspect-[3/4] w-[min(70vw,46dvh)] -translate-x-1/2 -translate-y-[54%] rounded-[50%] border-4 border-[#d4af37] shadow-[0_0_0_200vmax_rgba(6,16,31,0.62)] land:-translate-y-1/2">
                        <div className="absolute inset-x-6 h-0.5 bg-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.9)]" style={{ animation: 'att-scan 2.2s ease-in-out infinite' }} />
                    </div>
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 pt-4 pb-8">
                        <span className={cn('rounded-full px-3 py-1 text-xs font-black tracking-widest', kind === 'out' ? 'bg-white text-[#0a192f]' : 'bg-[#d4af37] text-[#0a192f]')}>{kind === 'out' ? 'CHECK OUT' : 'CHECK IN'}</span>
                        <span className="text-sm font-bold text-white tabular-nums">{clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {/* status under the face frame: scanning all the time, the advice when a frame was not usable */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-4 pt-10 pb-5">
                        <div className="mx-auto max-w-md text-center">
                            <div data-testid="att-checking" aria-live="polite" className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full bg-[#0a192f]/90 px-4 py-1.5 text-sm font-bold text-white">
                                <RefreshCw aria-hidden className="size-4 animate-spin text-[#d4af37]" />{scanMsg === 'Identifying…' ? 'Identifying…' : 'Scanning…'}
                            </div>
                            {scanMsg && scanMsg !== 'Identifying…'
                                ? <div role="alert" data-testid="att-error" className="mx-auto mb-3 w-fit max-w-full rounded-full bg-[#0a192f]/90 px-4 py-1.5 text-sm font-bold text-[#ffd666]">{scanMsg}</div>
                                : <div className="mb-3 text-sm font-bold text-white">Look at the camera · keep your face inside the frame</div>}
                            <Button variant="outline" onClick={cancel} data-testid="att-cancel" className="h-12 w-full rounded-2xl border-white/30 bg-black/40 font-bold text-white hover:bg-white/10"><X className="size-5" />Cancel</Button>
                        </div>
                    </div>
                </section>
            )}

            {/* ---------- result: who, photo, when, how - then back to the start ---------- */}
            {step === 'done' && result && (() => {
                const out = result.kind === 'out';
                const title = out ? 'Check Out Successful' : result.kind === 'back' ? 'Back In Successful' : 'Check In Successful';
                const place = hotelCheck(result.loc);
                const d = new Date(result.at);
                const row = (label, value, testid, strong) => (
                    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 land:py-1">
                        <dt className="shrink-0 text-[10px] font-black tracking-widest text-slate-600 uppercase">{label}</dt>
                        <dd data-testid={testid} className={cn('min-w-0 text-right text-sm font-bold text-slate-900', strong && 'text-base font-black')}>{value}</dd>
                    </div>
                );
                const photoBox = (src, label, testid) => (
                    <figure className="flex flex-col items-center gap-1">
                        <div className={cn('relative size-32 overflow-hidden rounded-2xl border-4 bg-[#0a192f] shadow-md min-[380px]:size-40 land:size-32', refPhoto ? '[@media(min-height:800px)]:size-44' : '[@media(min-height:800px)]:size-60 [@media(min-height:880px)]:size-64', 'land:size-32!', out ? 'border-[#0a192f]' : 'border-emerald-600')}>
                            {src ? <img data-testid={testid} src={src} alt={label} className={cn('size-full object-cover', testid === 'att-done-live' && '-scale-x-100')} />
                                : <div data-testid={testid} className="grid size-full place-items-center text-[#d4af37]"><KeyRound className="size-10" /></div>}
                        </div>
                        <figcaption className="text-[10px] font-black tracking-widest text-slate-600 uppercase">{label}</figcaption>
                    </figure>
                );
                return (
                    <div className="mx-auto max-w-md p-3 min-[360px]:p-4 land:max-w-4xl land:py-2">
                        <section data-testid="att-done" aria-live="polite" className="flex min-h-[calc(100dvh-6.5rem)] flex-col overflow-hidden rounded-3xl bg-white text-[#0a192f] shadow-2xl land:min-h-0">
                            <div data-testid="att-done-banner" className={cn('flex items-center gap-3 px-4 py-4 text-white land:py-1.5', out ? 'bg-[#0f2a52]' : 'bg-emerald-700')}>
                                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/15 ring-4 ring-white/25 land:size-10" style={{ animation: 'att-pop .45s ease-out' }}>
                                    {out ? <LogOut className="size-7" /> : <CheckCircle2 className="size-8" />}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black tracking-[0.25em] text-white uppercase land:text-[9px]">{out ? '✦ Goodbye ✦' : result.kind === 'back' ? '✦ Welcome back ✦' : '✦ Welcome ✦'} · Attendance marked</p>
                                    <h2 className="text-xl leading-tight font-black tracking-wide uppercase">{title}</h2>
                                </div>
                            </div>
                            <div className="flex flex-1 flex-col gap-4 p-4 land:grid land:grid-cols-[auto_minmax(0,1fr)] land:items-center land:gap-6 land:py-3">
                                <div className="flex justify-center gap-3">
                                    {refPhoto && photoBox(refPhoto, 'Registered', 'att-done-ref')}
                                    {photoBox(result.photo, result.photo ? 'Live photo' : 'PIN', 'att-done-live')}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <div className="mb-2 text-center land:text-left">
                                        <div className="truncate text-2xl font-black tracking-tight land:text-xl" data-testid="att-done-name">{result.name}</div>
                                        {(result.role || result.dept) && <div className="truncate text-xs font-semibold text-slate-600">{[result.role, result.dept].filter(Boolean).join(' · ')}</div>}
                                    </div>
                                    <dl className="rounded-2xl border border-slate-200 bg-slate-50 px-3">
                                        {result.staffId && row('Employee ID', result.staffId, 'att-done-id')}
                                        {row('Date', d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }))}
                                        {row(out ? 'Check-out time' : result.kind === 'back' ? 'Back-in time' : 'Check-in time',
                                            <span className="inline-flex items-center gap-1.5 tabular-nums"><Clock aria-hidden className="size-4 text-slate-600" /><span data-testid="att-done-time">{result.time}</span></span>, undefined, true)}
                                        {out && row('Worked', `In ${result.checkIn} · ${formatHours(result.hours)}`, 'att-done-worked')}
                                        {row('Verified', <span className="inline-flex items-center gap-1 text-emerald-800"><BadgeCheck aria-hidden className="size-4" />{how(result)}</span>, 'att-face')}
                                        {row('Location', place.at === null
                                            ? <span className="text-amber-800">{result.locError} Saved without location.</span>
                                            : place.at ? <span className="text-emerald-800">At Hotel Sky 5 ✓ ({formatDistance(place.m)})</span>
                                                : <span className="text-red-700">Outside the hotel · {formatDistance(place.m)} away - saved and shown to the manager</span>, 'att-place')}
                                    </dl>
                                    <div data-testid="att-done-today" className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 text-center land:hidden">
                                        {[['In today', has(result.checkIn) ? result.checkIn : '--'], ['Out', has(result.checkOut) ? result.checkOut : '--'], ['Hours', formatHours(result.hours)]].map(([k, v]) => (
                                            <div key={k} className="py-2"><div className="text-[9px] font-black tracking-widest text-slate-600 uppercase">{k}</div><div className="font-black text-slate-900 tabular-nums">{v}</div></div>
                                        ))}
                                    </div>
                                    <div className="mt-auto pt-4 land:pt-1.5">
                                        <Button className="h-12 w-full rounded-2xl bg-[#0a192f] text-base font-black text-[#d4af37] hover:bg-[#0a192f]/90 land:h-10" onClick={goHome}>Done</Button>
                                        <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200 land:mt-2" aria-hidden>
                                            <div className={cn('h-full rounded-full', out ? 'bg-[#0f2a52]' : 'bg-emerald-600')} style={{ animation: `att-bar ${DONE_SECONDS}s linear forwards` }} />
                                        </div>
                                        <p className="mt-1 text-center text-[10px] font-black tracking-widest text-slate-600 uppercase land:hidden">Back to start in {DONE_SECONDS}s</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                );
            })()}

            {/* ---------- "Use PIN": choose your name, then the PIN pad ---------- */}
            <Dialog open={picking} onOpenChange={(o) => { if (!o) { setPicking(false); setSearch(''); } }}>
                <DialogContent className="ui max-h-[94dvh] max-w-sm overflow-y-auto bg-white text-[#0a192f]" data-testid="att-pin-pick">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-[#0a192f]"><KeyRound className="size-5" />{kind === 'out' ? 'Check out with PIN' : 'Check in with PIN'}</DialogTitle>
                        <DialogDescription>Choose your name, then type your 4-digit PIN.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="In or out">
                        {[['in', 'Check in'], ['out', 'Check out']].map(([k, label]) => (
                            <button key={k} type="button" data-testid={`att-pin-kind-${k}`} aria-pressed={(kind || 'in') === k} onClick={() => setKind(k)}
                                className={cn('h-10 rounded-xl border text-sm font-black', (kind || 'in') === k ? 'border-[#0a192f] bg-[#0a192f] text-[#d4af37]' : 'border-slate-200 text-slate-700')}>{label}</button>
                        ))}
                    </div>
                    {staff.length > 8 && (
                        <div className="relative">
                            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" />
                            <input data-testid="att-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name" aria-label="Search your name"
                                className="h-10 w-full rounded-xl border border-slate-200 pr-3 pl-9 text-sm outline-none focus:border-[#d4af37]" />
                        </div>
                    )}
                    <div tabIndex={0} role="group" aria-label="Staff names" className="max-h-[50dvh] land:max-h-[34dvh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]">
                        {pinList.map(s => {
                            const rec = pinRecord(s);
                            const ok = !!(rec?.pinSet && rec.staffId);
                            return (
                                <button key={s.name} type="button" disabled={!ok} data-testid={`att-pin-name-${s.name}`} onClick={() => pinFor({ ...s, ...rec })}
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#d4af37]/10 disabled:opacity-60">
                                    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0a192f] text-xs font-black text-[#d4af37]">{initials(s.name)}</span>
                                    <span className="min-w-0 flex-1"><span className="block truncate font-bold">{s.name}</span><span className="block truncate text-xs text-slate-600">{ok ? (s.role || deptLabel(s.dept)) : 'No PIN yet - the manager sets it'}</span></span>
                                </button>
                            );
                        })}
                        {pinList.length === 0 && <p className="p-3 text-center text-sm text-slate-600">No name matches.</p>}
                    </div>
                </DialogContent>
            </Dialog>
            <PinDialog open={!!pinAsk} title={pinAsk ? `${pinAsk.rec.name} PIN` : ''} person={pinAsk?.rec.name} badge={kind === 'out' ? 'Check out with PIN' : 'Check in with PIN'}
                description="Enter your 4-digit PIN (the same as in TimeStation)"
                onClose={() => setPinAsk(null)}
                onSubmit={async (pin) => {
                    const ok = await verifyPin(pinAsk.rec.staffId, pin);
                    if (!ok) return 'Wrong PIN. Try again.';
                    afterPin(pinAsk.rec);
                    return null;
                }} />
        </div>
    );
}
