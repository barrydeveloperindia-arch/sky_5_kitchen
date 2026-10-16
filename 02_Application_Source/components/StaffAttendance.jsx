import { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, Clock, KeyRound, LogIn, LogOut, MapPin, Pencil, RefreshCw, ScanFace, Search, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getServices, whenSignedIn } from '../lib/firebase';
import { normalizeRegistry } from '../lib/staff';
import { toFirestore, trackWrite, useOnline } from '../lib/syncedState';
import { StaffFormDialog } from './ops/StaffDirectory';
import FaceDialog from './ops/FaceDialog';
import PinDialog from './ops/PinDialog';
import { verifyPin } from '../lib/staffPin';
import { allStaff, setStaffStatus } from '../lib/staffDirectory';
import { faceKey, FACES, findFaces, faceQuality, registeredFace, registerFace, sameFace, otherFace, warmUpFaces } from '../lib/faceMatch';
import {
    dayKey, isoDate, staffNames, hotelCheck, formatDistance, findActiveLog, nextAction, waitRemainingMs, formatWait, tapUpdate, logIdFor, toLoc, workedHours, formatHours,
    STAFF_KEY, MAX_PHOTO_CHARS,
} from '../lib/staffAttendance';

const readSaved = () => { try { return localStorage.getItem(STAFF_KEY) || ''; } catch { return ''; } };
const writeSaved = (v) => { try { if (v) localStorage.setItem(STAFF_KEY, v); else localStorage.removeItem(STAFF_KEY); } catch { /* private mode */ } };
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const DEPTS = [['reception', 'Front Desk & Management'], ['kitchen', 'Kitchen'], ['housekeeping', 'Housekeeping']];
const NO_NET = 'No internet. Connect and open the link again.';
const DONE_SECONDS = 10;        // the success screen goes back to the start by itself, like the AuraLock terminal
const AUTO_PHOTO_SECONDS = 3;   // the selfie is taken by itself after this countdown
const MAX_FACE_TRIES = 5;      // photos without a usable face before the camera closes by itself

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
        if (url.length <= MAX_PHOTO_CHARS) return { canvas, url };
    }
    return { canvas, url: null };
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

export default function StaffAttendance() {
    const [registry, setRegistry] = useState(null);
    const [adding, setAdding] = useState(false);   // "New staff register" form open
    const [editing, setEditing] = useState(null);  // staff record whose details are being edited
    const [faceBox, setFaceBox] = useState(null);  // { staff, face } while "Re-scan face" is open
    const [pinAsk, setPinAsk] = useState(null);    // { rec, title, then } while a PIN is asked
    const [pinFallback, setPinFallback] = useState(false);   // the face did not work: offer the PIN
    const lastPhotoRef = useRef(null);             // the last camera photo (kept for a PIN check-in)
    const [logs, setLogs] = useState([]);
    const [ready, setReady] = useState(false);
    const [me, setMe] = useState(readSaved);
    const [step, setStep] = useState('home'); // home | camera | saving | done
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [search, setSearch] = useState('');
    const [now, setNow] = useState(() => Date.now());
    const online = useOnline();
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const locRef = useRef(null);
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
                () => setError(NO_NET)));
            unsubs.push(onSnapshot(query(collection(db, 'hotel_attendance'), where('date', 'in', [today, yesterday])), s => {
                setLogs(s.docs.map(d => d.data()));
                setReady(true);
            }, () => setError(NO_NET)));
        });
        return () => { alive = false; unsubs.forEach(u => u()); };
    }, [today, yesterday]);

    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };
    useEffect(() => stopCamera, []);

    const names = registry ? staffNames(registry) : [];
    const known = names.some(n => n.name === me);
    const myRole = names.find(n => n.name === me)?.role || '';
    const myStaffId = names.find(n => n.name === me)?.staffId || '';
    const who = { name: me, staffId: myStaffId };   // finds today's row even after a name correction
    const shown = names.filter(n => n.name.toLowerCase().includes(search.trim().toLowerCase()));
    const log = findActiveLog(logs, who, new Date(now));
    const nightShift = !!log && log.date !== today;
    const action = nextAction(log, now);
    const waitLeft = waitRemainingMs(log, now);
    const inT = log?.checkIn && log.checkIn !== '--' ? log.checkIn : '--';
    const outT = log?.checkOut && log.checkOut !== '--' ? log.checkOut : '--';
    const hint = action === 'out' && outT !== '--' ? 'Leaving later? Tap CHECK OUT again, the last tap counts.'
        : 'A selfie and your location are saved with every tap.';
    const clock = new Date(now);

    const closeDone = () => { setResult(null); setStep('home'); };
    // Automatic photo (like the AuraLock terminal): once the camera shows a picture, count 3-2-1 and take it
    const [autoIn, setAutoIn] = useState(null);
    const [attempt, setAttempt] = useState(0);        // a failed face check starts the countdown again
    const [checking, setChecking] = useState(false);  // "Checking your face..."
    const busyRef = useRef(false);
    const captureRef = useRef(null);
    useEffect(() => {
        if (step !== 'camera') return undefined;
        let left = null, stopped = false;
        const t = setInterval(() => {
            if (stopped) return;
            if (left === null) {
                if (videoRef.current?.videoWidth) { left = AUTO_PHOTO_SECONDS; setAutoIn(left); }
                return;
            }
            left -= 1;
            setAutoIn(left);
            if (left <= 0) { stopped = true; clearInterval(t); captureRef.current?.(); }
        }, 1000);
        return () => { stopped = true; clearInterval(t); setAutoIn(null); };
    }, [step, attempt]);
    // every new screen starts at the top (a long name list leaves the page scrolled down)
    useEffect(() => {
        // camera: bring the photo button on screen (a phone held sideways is short); otherwise start at the top
        if (step === 'camera') requestAnimationFrame(() => document.querySelector('[data-testid="att-capture"]')?.scrollIntoView({ block: 'end' }));
        else window.scrollTo(0, 0);
    }, [step, me]);
    useEffect(() => {
        if (step !== 'done') return undefined;
        const t = setTimeout(closeDone, DONE_SECONDS * 1000);
        return () => clearTimeout(t);
    }, [step]);

    // Get the face check ready while the person is on the start screen (first use is slow on a phone)
    useEffect(() => {
        if (!me || step !== 'home') return undefined;
        const t = setTimeout(() => { warmUpFaces().catch(() => {}); }, 1200);
        return () => clearTimeout(t);
    }, [me, step]);

    // save only the department lists that changed, so a change made on another device meanwhile is kept
    const saveRegistry = (next) => {
        const { db } = getServices();
        const changed = Object.fromEntries(['reception', 'kitchen', 'housekeeping'].filter(d => next[d] !== registry?.[d]).map(d => [d, toFirestore(next[d])]));
        if (Object.keys(changed).length) trackWrite(setDoc(doc(db, 'hotel_state', 'staffRegistry'), { value: changed }, { merge: true })).catch(() => setError('Could not save. Check internet and try again.'));
        setRegistry(next);
    };
    const myRecord = () => (registry ? allStaff(registry).find(x => x.name === me) : null);
    const recordOf = (name) => (registry ? allStaff(registry).find(x => x.name === name) : null);
    // someone with a PIN (the same as in TimeStation) must type it first; without a PIN it goes straight on
    const requirePin = (rec, badge, then) => {
        if (!rec?.pinSet || !rec.staffId) { then(); return; }
        setPinAsk({ rec, badge, then });
    };
    const editMe = () => { const r = myRecord(); if (r) requirePin(r, 'Edit details', () => setEditing(r)); };
    const editFromList = (name) => { const r = recordOf(name); if (r) requirePin(r, 'Edit details', () => setEditing(r)); };
    const rescanMe = () => { const r = myRecord(); if (r) requirePin(r, 'Re-scan face', () => openRescan(r)); };
    const openRescan = async (r) => {
        let face = null;
        try {
            await whenSignedIn();
            const f = await getDoc(doc(getServices().db, FACES, faceKey(r)));
            const d = f.exists() ? f.data() : null;
            face = d && !d.reset && d.descriptor?.length === 128 ? d : null;
        } catch { /* shown as "no face yet" */ }
        let photo = null;
        if (face?.source === 'staff-photo' && r.photoId) {
            try { const p = await getDoc(doc(getServices().db, 'hotel_staff_photos', r.photoId)); photo = p.exists() ? p.data().data : null; } catch { /* no picture */ }
        }
        setFaceBox({ staff: r, face, photo });
    };
    // "Delete" = this person has left: off the list, the TV and the counts; their old attendance stays
    const removeMe = () => { const r = myRecord(); if (r) requirePin(r, 'Delete', () => doRemove(r)); };
    const doRemove = (r) => {
        if (!r || !window.confirm(`Delete ${r.name} from the staff list? (Marked as left today - old attendance is kept.)`)) return;
        const d = new Date();
        saveRegistry(setStaffStatus(registry, r.id, 'Left', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`));
        changeName();
    };

    const choose = (name) => { setMe(name); writeSaved(name); setError(''); setSearch(''); setStep('home'); };
    const changeName = () => { setMe(''); writeSaved(''); setResult(null); setStep('home'); };

    const openCamera = async () => {
        setError('');
        setAttempt(0);
        locRef.current = locate(); // ask for location while the camera opens
        warmUpFaces().catch(() => {});   // and get the face check ready (normally already done)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
            streamRef.current = stream;
            setStep('camera');
        } catch {
            setError('Camera permission is needed. Allow the camera for this site and try again (selfie ke bina attendance nahi lagegi).');
        }
    };

    // Put the camera on screen once the video box exists (on a slow phone that is later than the next frame)
    useEffect(() => {
        const video = videoRef.current, stream = streamRef.current;
        if (step !== 'camera' || !video || !stream || video.srcObject === stream) return;
        video.srcObject = stream;
        video.play().catch(() => {});
    }, [step]);

    const capture = async () => {
        const video = videoRef.current;
        if (step !== 'camera' || busyRef.current) return; // already taken (countdown and button at the same moment)
        if (!video || !video.videoWidth) { setError('Camera is starting, try again in a second.'); return; }
        busyRef.current = true;
        setChecking(true);
        const retry = (msg) => {
            setChecking(false); busyRef.current = false;
            // nobody in front of the camera for a while: close it (battery) and wait for a new tap
            if (attempt + 1 >= MAX_FACE_TRIES) { stopCamera(); setStep('home'); setError(`${msg} Tap ${action === 'in' ? 'CHECK IN' : 'CHECK OUT'} to try again.`); setPinFallback(true); return; }
            setError(msg); setAttempt(a => a + 1);
        };
        const frame = fullFrame(video);
        const shot = snap(video);
        if (!shot.url) { retry('Photo could not be saved, try again.'); return; }
        const photo = shot.url;
        lastPhotoRef.current = photo;
        // 1. one clear face, close enough
        let faces;
        try { faces = await findFaces(frame); } catch { retry('Face check could not start. Check internet and try again.'); return; }
        const quality = faceQuality(faces, frame.width);
        if (!quality.ok) { retry(quality.reason); return; }
        // 2. it must be the chosen person: compare with their registered face (staff photo, or first check-in)
        const staff = names.find(n => n.name === me) || { name: me };
        let registered;
        try { registered = await registeredFace(staff); } catch { retry('Could not check your face. Check internet and try again.'); return; }
        const refuse = (msg) => { stopCamera(); setChecking(false); busyRef.current = false; setStep('home'); setError(msg); setPinFallback(true); };
        const live = quality.face.descriptor;
        let face = { check: 'registered' };
        if (registered) {
            const r = sameFace(live, registered.descriptor);
            if (!r.match) {
                // a far or sideways photo can miss the real person: ask for a better one; refuse only a clear photo
                if (!faceQuality(faces, frame.width, { register: true }).ok) { retry('Come closer and look straight at the camera.'); return; }
                refuse(`This face does not match ${me}. Choose your own name - or ask the manager to update your photo.`);
                return;
            }
            face = { check: 'matched', distance: r.distance, source: registered.source };
        } else {
            // first check-in: this face becomes theirs, so it must be a good photo of a face nobody else has
            const strict = faceQuality(faces, frame.width, { register: true });
            if (!strict.ok) { retry(strict.reason); return; }
        }
        let other;
        try { other = await otherFace(live, staff); } catch { retry('Could not check your face. Check internet and try again.'); return; }
        if (other && (!registered || other.distance < face.distance)) {
            refuse(registered ? `This face looks like ${other.staffName}, not ${me}. Choose your own name - or ask the manager.` : `This face is already registered for ${other.staffName}. Choose your own name.`);
            return;
        }
        stopCamera();
        setChecking(false);
        busyRef.current = false;
        await saveTap(photo, face, face.check === 'registered' ? { staff, descriptor: quality.face.descriptor } : null);
    };

    // Save one tap (check in, or move the check-out): the selfie, the row, and on a first check-in the face.
    // Used after the face check, and after a right PIN when the face did not work.
    const saveTap = async (photo, face, register) => {
        setPinFallback(false);
        setStep('saving');
        const { loc, error: locError } = await (locRef.current || locate());
        const at = new Date();
        // decide on the tap's own time (not the last screen refresh), so a tap just after midnight is dated correctly
        const row0 = findActiveLog(logs, who, at);
        const kind = nextAction(row0, at.getTime());
        if (kind === 'wait') { setStep('home'); return; }
        const id = row0 ? String(row0.id) : logIdFor(me, isoDate(at));
        const photoId = photo ? `${id}-${kind}-${at.getTime()}` : null;   // a PIN tap with no camera photo has no selfie
        const fields = tapUpdate(row0, kind, { at, photoId, loc });
        fields[kind === 'in' ? 'inFace' : 'outFace'] = face;
        if (!loc) fields[kind === 'in' ? 'inLocError' : 'outLocError'] = locError;
        // the row carries the staff ID, and the current name (a corrected name updates today's row)
        if (myStaffId) fields.staffId = myStaffId;
        fields.staffName = me;
        const row = row0 ? fields : { id, staffName: me, date: dayKey(at), dateISO: isoDate(at), checkOut: '--', _order: at.getTime(), ...fields };
        try {
            const { db } = getServices();
            if (photo) await trackWrite(setDoc(doc(db, 'hotel_attendance_photos', photoId), { logId: id, kind, staffName: me, at: at.toISOString(), data: photo }));
            if (register) await registerFace(register.staff, register.descriptor, photoId);   // first time: this face is now theirs
            await trackWrite(setDoc(doc(db, 'hotel_attendance', id), toFirestore(row), { merge: true }));
            const saved = { ...(row0 || {}), ...row };
            setResult({ kind, photo, loc, locError, face, at: at.toISOString(), time: kind === 'in' ? saved.checkIn : saved.checkOut, checkIn: saved.checkIn, hours: workedHours(saved) });
            setStep('done');
        } catch {
            setError('Could not save. Check internet and try again.');
            setStep('home');
        }
    };
    useEffect(() => { captureRef.current = capture; });   // the countdown always calls the latest capture
    // the face did not work: the person's PIN (as in TimeStation) checks them in / out instead
    const checkInWithPin = () => {
        const r = myRecord();
        if (!r) return;
        requirePin(r, action === 'out' ? 'Check out with PIN' : 'Check in with PIN', () => saveTap(lastPhotoRef.current, { check: 'pin' }, null));
    };

    const stamp = (iso) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tapButton = (kind) => {
        // during the 2-minute guard the CHECK OUT button shows a countdown, then switches on by itself
        const active = ready && action === kind;
        const counting = ready && action === 'wait' && kind === 'out';
        const Icon = kind === 'in' ? LogIn : LogOut;
        return (
            <button type="button" data-testid={active ? 'att-tap' : `att-tap-off-${kind}`} disabled={!active} onClick={openCamera}
                className={cn('flex flex-col items-center gap-1 rounded-2xl px-4 py-3.5 text-xs font-black tracking-wider uppercase transition-all active:scale-95 disabled:opacity-35',
                    kind === 'in' ? 'bg-gradient-to-r from-[#d4af37] to-[#e6c65c] text-[#0a192f] shadow-lg shadow-[#d4af37]/25' : 'border border-[#d4af37]/50 bg-[#112240] text-white')}>
                <Icon className="size-5" />{kind === 'in' ? 'CHECK IN' : 'CHECK OUT'}
                {counting && <span data-testid="att-wait-count" className="text-[10px] font-bold tracking-normal normal-case">in {formatWait(waitLeft)}</span>}
            </button>
        );
    };

    return (
        <div className="ui min-h-dvh bg-[#f4f6fa] text-[#0a192f]" data-testid="staff-attendance">
            <style>{'@keyframes att-scan{0%,100%{top:12%}50%{top:86%}}'}</style>
            {/* App bar (a div, not <header>: the shop's global header style must not apply here) */}
            <div role="banner" className="bg-[#0a192f] shadow-md">
                <div className="mx-auto flex max-w-md items-center gap-3 px-3 py-3 min-[360px]:px-4">
                    <a href="/" data-testid="att-back" aria-label="Back to the hotel app"
                        className="grid size-9 shrink-0 place-items-center rounded-full border border-white/15 text-white transition-colors hover:border-[#d4af37] hover:text-[#d4af37]">
                        <ChevronLeft aria-hidden className="size-5" />
                    </a>
                    <div aria-hidden className="shrink-0 rounded-lg border border-[#d4af37]/60 px-2 py-1 text-center font-serif leading-none text-[#d4af37]">
                        <div className="text-[6px] font-semibold tracking-[0.25em] text-white">HOTEL</div><div className="text-sm font-black">SKY 5</div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] leading-tight font-bold text-white">Staff Attendance</div>
                        <div data-testid="att-subtitle" className="truncate text-[11px] leading-tight text-[#aab4cf]">Hotel Sky 5 · Panchkula</div>
                    </div>
                    <span data-testid="att-online" title={online ? 'Connected' : 'No internet'} className={cn('flex shrink-0 items-center gap-1.5 text-[11px] font-semibold', online ? 'text-emerald-300' : 'text-red-300')}>
                        <span className={cn('size-2 rounded-full', online ? 'animate-pulse bg-emerald-400' : 'bg-red-400')} />{online ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>
            <div className="mx-auto max-w-md space-y-4 p-3 min-[360px]:p-4 [@media(max-height:520px)]:space-y-2 [@media(max-height:520px)]:pt-2">
                {/* top bar, like the AuraLock terminal */}
                {/* while the camera is open the advice is shown on the camera itself (that is where the person looks) */}
                {/* the face did not work: one clear card with the two ways on (try again / PIN) */}
                {error && step === 'home' && pinFallback ? (
                    <div data-testid="att-face-failed" className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
                        <div className="flex items-center gap-2 text-sm font-black text-amber-900"><ScanFace className="size-4" />Face not recognised</div>
                        <p role="alert" data-testid="att-error" className="mt-1 text-sm text-amber-900">{error}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button variant="outline" onClick={() => { setError(''); setPinFallback(false); openCamera(); }} data-testid="att-try-again" className="h-11 rounded-xl border-amber-300 bg-white font-bold"><RefreshCw />Try again</Button>
                            {myRecord()?.pinSet
                                ? <Button onClick={checkInWithPin} data-testid="att-use-pin" className="h-11 rounded-xl bg-[#0a192f] font-black text-[#d4af37] hover:bg-[#0a192f]/90"><KeyRound />Use PIN</Button>
                                : <p data-testid="att-no-pin" className="self-center text-xs text-amber-900">No PIN yet - the manager sets it in OPS Center → Workforce.</p>}
                        </div>
                    </div>
                ) : error && step !== 'camera' && <div role="alert" data-testid="att-error" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
                <PinDialog open={!!pinAsk} title={pinAsk ? `${pinAsk.rec.name} ${pinAsk.badge}` : ''} person={pinAsk?.rec.name} badge={pinAsk?.badge}
                    description="Enter your 4-digit PIN (the same as in TimeStation)"
                    onClose={() => setPinAsk(null)}
                    onSubmit={async (pin) => {
                        const ok = await verifyPin(pinAsk.rec.staffId, pin);
                        if (!ok) return 'Wrong PIN. Try again.';
                        const then = pinAsk.then;
                        setPinAsk(null);
                        then();
                        return null;
                    }} />

                {!registry && !error && <p className="p-10 text-center text-sm text-slate-600">Loading…</p>}

                {registry && !known && (
                    <section className="space-y-3">
                        <div className="px-1">
                            <h2 className="text-lg font-black text-slate-900">Apna naam chuniye</h2>
                            <p className="text-sm text-slate-600">Only once. This phone will remember you.</p>
                        </div>
                        {names.length > 8 && (
                            <div className="relative">
                                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-600" />
                                <input data-testid="att-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name"
                                    aria-label="Search your name" className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-3 pl-9 text-sm shadow-sm outline-none focus:border-[#d4af37]" />
                            </div>
                        )}
                        {names.length === 0 && <p data-testid="att-no-staff" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No staff in the register yet. Ask the manager to add you in OPS Center → Workforce.</p>}
                        {names.length > 0 && shown.length === 0 && <p data-testid="att-no-match" className="rounded-2xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-600">No name matches “{search.trim()}”.</p>}
                        {DEPTS.map(([dept, label]) => {
                            const list = shown.filter(n => n.dept === dept);
                            if (!list.length) return null;
                            return (
                                <div key={dept} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-black tracking-[0.15em] text-slate-600 uppercase">{label}</h3>
                                    {list.map(n => (
                                        <div key={n.name} className="flex items-center border-b border-slate-100 last:border-b-0">
                                            <button type="button" data-testid={`att-pick-${n.name}`} onClick={() => choose(n.name)}
                                                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-[#d4af37]/10 active:bg-[#d4af37]/20">
                                                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0a192f] text-xs font-black text-[#d4af37]">{initials(n.name)}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate font-bold text-slate-900">{n.name}</span>
                                                    <span className="block truncate text-xs text-slate-600">{n.role || label}</span>
                                                </span>
                                                <ChevronRight aria-hidden className="size-4 text-slate-600" />
                                            </button>
                                            {/* edit this person's details straight from the list */}
                                            <button type="button" data-testid={`att-edit-${n.name}`} aria-label={`Edit details of ${n.name}`}
                                                onClick={() => editFromList(n.name)}
                                                className="mr-2 grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-700 hover:bg-[#d4af37]/10 active:bg-[#d4af37]/20">
                                                <Pencil className="size-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                        {/* a new person not on the list registers here (same form as OPS Center -> Workforce) */}
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[#d4af37] bg-[#fdf8e7] p-3">
                            <div className="min-w-0 text-sm"><b className="text-slate-900">Naam list me nahi hai?</b><div className="text-xs text-slate-700">New staff - register yourself here.</div></div>
                            <Button data-testid="att-new-staff" onClick={() => setAdding(true)} className="shrink-0 bg-[#0a192f] text-[#d4af37] hover:bg-[#0a192f]/90"><UserPlus />New staff register</Button>
                        </div>
                    </section>
                )}
                <StaffFormDialog open={adding || !!editing} editing={editing} registry={registry || {}} onClose={() => { setAdding(false); setEditing(null); }}
                    onSaved={(next, added) => {
                        const renamed = editing && allStaff(next).find(x => x.id === editing.id);
                        saveRegistry(next);
                        if (added) choose(added.name);
                        else if (renamed && me && editing.name === me && renamed.name !== me) choose(renamed.name);   // own name corrected
                    }} />
                <FaceDialog staff={faceBox?.staff || null} face={faceBox?.face || null} photoSrc={faceBox?.photo || null}
                    onClose={() => setFaceBox(null)}
                    onPhotoSaved={(st) => saveRegistry(Object.fromEntries(Object.entries(registry).map(([k, v]) => [k, Array.isArray(v) ? v.map(x => (x?.id === st.id ? { ...x, photoId: st.staffId } : x)) : v])))}
                    onFaceChanged={() => {}} />

                {registry && known && step !== 'done' && (
                    <>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0a192f] text-sm font-black text-[#d4af37]">{initials(me)}</span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-black text-slate-900" data-testid="att-me">{me}</div>
                                {myRole && <div className="truncate text-xs text-slate-600">{myRole}</div>}
                            </div>
                            {step === 'home' && <Button variant="ghost" size="sm" onClick={changeName} data-testid="att-change">Not you?</Button>}
                        </div>
                        {step === 'home' && (
                            <div className="grid grid-cols-3 gap-2" data-testid="att-manage">
                                <Button variant="outline" size="sm" onClick={editMe} data-testid="att-edit" className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold"><Pencil />Edit details</Button>
                                <Button variant="outline" size="sm" onClick={rescanMe} data-testid="att-rescan" className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold"><ScanFace />Re-scan face</Button>
                                <Button variant="outline" size="sm" onClick={removeMe} data-testid="att-delete" className="h-9 rounded-xl border-red-200 bg-white text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 />Delete</Button>
                            </div>
                        )}

                        <div className="text-center">
                            <div className="text-[2.5rem] leading-none font-black tracking-tight text-[#0a192f] tabular-nums min-[360px]:text-5xl [@media(max-height:520px)]:text-3xl" data-testid="att-clock">{clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\s?(AM|PM)$/, '')}<span className="ml-1.5 text-xl font-black text-[#8a6d10]">{clock.getHours() < 12 ? 'AM' : 'PM'}</span></div>
                            <div className="mt-1 text-[10px] font-black tracking-[0.2em] text-slate-600 uppercase">{clock.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        </div>

                        {/* main panel: standby with the two buttons, or the live camera */}
                        <div className="relative h-[44vh] min-h-72 overflow-hidden rounded-[2rem] [@media(max-height:520px)]:h-auto [@media(max-height:520px)]:min-h-0 border-b-4 border-[#d4af37] bg-[#0a192f] shadow-xl">
                            {step === 'camera' ? (
                                <>
                                    <video ref={videoRef} data-testid="att-video" playsInline muted className="size-full -scale-x-100 object-cover [@media(max-height:520px)]:h-[52vh]" />
                                    <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 backdrop-blur-md">
                                        <span className="size-1.5 animate-pulse rounded-full bg-[#d4af37]" />
                                        <span className="text-[9px] font-black tracking-widest text-white uppercase">Camera active</span>
                                    </div>
                                    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                                        <div className="relative h-60 w-52">
                                            {['top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl'].map(c => (
                                                <div key={c} className={cn('absolute size-10 border-[#d4af37]', c)} />
                                            ))}
                                        </div>
                                    </div>
                                    <div aria-hidden className="absolute inset-x-0 h-px bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.9)]" style={{ animation: 'att-scan 2.5s linear infinite' }} />
                                    {checking && (
                                        <div data-testid="att-checking" className="absolute inset-0 grid place-items-center bg-[#0a192f]/55 backdrop-blur-[2px]">
                                            <div className="flex items-center gap-2 rounded-full bg-[#0a192f] px-4 py-2 text-sm font-bold text-white"><RefreshCw aria-hidden className="size-4 animate-spin text-[#d4af37]" />Checking your face…</div>
                                        </div>
                                    )}
                                    {autoIn > 0 && !checking && (
                                        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                                            <div data-testid="att-countdown" className="grid size-24 place-items-center rounded-full border-4 border-[#d4af37] bg-[#0a192f]/60 text-5xl font-black text-white tabular-nums backdrop-blur-sm">{autoIn}</div>
                                        </div>
                                    )}
                                    {autoIn > 0 && <span aria-live="polite" className="sr-only">Photo in {autoIn}</span>}
                                    {/* dark fade at the bottom so the words stay readable on any background (white shirt, bright wall) */}
                                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0a192f]/80 to-transparent" />
                                    <div className="absolute inset-x-0 bottom-4 px-4 text-center drop-shadow-md">
                                        {error
                                            ? <div role="alert" data-testid="att-error" className="mx-auto mb-1 w-fit max-w-full rounded-full bg-[#0a192f]/85 px-3 py-1 text-xs font-bold text-[#ffd666]">{error}</div>
                                            : <div className="text-[9px] font-black tracking-[0.2em] text-[#e6c65c] uppercase">Position your face in the frame</div>}
                                        {autoIn === null && attempt === 0 && <div className="text-xs font-semibold text-white/80">Starting camera…</div>}
                                        <div className="text-sm font-bold text-white">{action === 'in' ? 'Check-in selfie' : 'Check-out selfie'}</div>
                                    </div>
                                </>
                            ) : step === 'saving' ? (
                                <div data-testid="att-saving" className="flex size-full flex-col items-center justify-center gap-3 text-white">
                                    <RefreshCw className="size-8 animate-spin text-[#d4af37]" />
                                    <span className="text-xs font-black tracking-widest uppercase">Saving…</span>
                                </div>
                            ) : (
                                <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-[#0a192f] via-[#112240] to-[#0a192f] p-6 text-white [@media(max-height:520px)]:p-3">
                                    <div className="mb-3 rounded-xl border border-[#d4af37]/60 px-3 py-1 text-center font-serif leading-none text-[#d4af37] [@media(max-height:520px)]:hidden">
                                        <div className="text-[8px] tracking-[0.3em]">HOTEL</div><div className="text-xl font-black">SKY 5</div>
                                    </div>
                                    <h2 data-testid={action === 'wait' ? 'att-wait' : undefined} className="mb-1 text-lg font-black tracking-tight [@media(max-height:520px)]:mb-0 [@media(max-height:520px)]:text-base">{!ready ? 'Loading…' : action === 'wait' ? 'Saved ✓' : 'Ready to scan'}</h2>
                                    <p className="mb-5 text-center text-[10px] font-bold tracking-[0.15em] text-slate-300 uppercase [@media(max-height:520px)]:mb-2">
                                        {action === 'wait' ? `Check-out opens in ${formatWait(waitLeft)}` : 'Camera off · tap below to scan'}
                                    </p>
                                    {nightShift && <div data-testid="att-night" className="mb-3 rounded-lg bg-white/10 px-3 py-1.5 text-center text-[11px] font-semibold text-amber-200">Night shift from {log.date} is still open: CHECK OUT closes it.</div>}
                                    <div className="grid w-full max-w-xs grid-cols-2 gap-3">{tapButton('in')}{tapButton('out')}</div>
                                    {ready && action !== 'wait' && myRecord()?.pinSet && (
                                        <button type="button" onClick={checkInWithPin} data-testid="att-pin-link"
                                            className="mt-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#e6c65c] underline-offset-4 hover:underline [@media(max-height:520px)]:mt-2">
                                            <KeyRound className="size-3.5" />Face not working? {action === 'out' ? 'Check out' : 'Check in'} with PIN
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {step === 'camera' && (
                            <div className="grid gap-2">
                                <Button data-testid="att-capture" onClick={capture} className="h-14 w-full rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#e6c65c] text-base font-black tracking-wider text-[#0a192f] uppercase shadow-lg shadow-[#d4af37]/25 hover:opacity-95"><Camera className="size-5" />{autoIn > 0 ? `Photo in ${autoIn}… (tap to take now)` : 'Take photo now'}</Button>
                                <Button variant="ghost" className="h-11 w-full rounded-2xl text-xs font-bold tracking-widest uppercase" onClick={() => { stopCamera(); setStep('home'); }}>Cancel</Button>
                            </div>
                        )}

                        {step === 'home' && (
                            <>
                                <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
                                    <div className="py-2.5"><div className="text-[9px] font-black tracking-widest text-slate-600 uppercase">In</div><div className={cn('font-black tabular-nums', inT === '--' ? 'text-slate-600' : 'text-emerald-700')} data-testid="att-in-time">{inT}</div></div>
                                    <div className="py-2.5"><div className="text-[9px] font-black tracking-widest text-slate-600 uppercase">Out</div><div className={cn('font-black tabular-nums', outT === '--' ? 'text-slate-600' : 'text-[#0a192f]')} data-testid="att-out-time">{outT}</div></div>
                                    <div className="py-2.5"><div className="text-[9px] font-black tracking-widest text-slate-600 uppercase">Hours</div><div className="font-black text-slate-900 tabular-nums" data-testid="att-hours">{formatHours(workedHours(log))}</div></div>
                                </div>
                                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-600"><Camera aria-hidden className="size-3.5 shrink-0" />{hint}</p>
                            </>
                        )}
                    </>
                )}

                {step === 'done' && result && (
                    <section data-testid="att-done" className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 text-center">
                        <div className={cn('relative w-64 max-w-[80vw] overflow-hidden rounded-2xl border-4 bg-black shadow-xl', result.kind === 'in' ? 'border-[#d4af37]' : 'border-[#0a192f]')}>
                            {result.photo
                                ? <img src={result.photo} alt="Your selfie" className="block h-auto w-full -scale-x-100" />
                                : <div className="grid h-48 place-items-center bg-[#0a192f] text-[#d4af37]"><KeyRound className="size-12" /></div>}
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-left">
                                <div className="truncate text-sm font-bold text-white">{me}</div>
                                <div className={cn('text-[11px] font-black tracking-wider', result.kind === 'in' ? 'text-[#e6c65c]' : 'text-sky-200')}>{result.kind === 'in' ? 'CHECK IN' : 'CHECK OUT'}  {stamp(result.at)} IST</div>
                            </div>
                            <div className={cn('absolute top-2 right-2 grid size-8 place-items-center rounded-full shadow', result.kind === 'in' ? 'bg-[#d4af37]' : 'bg-[#0a192f]')}>
                                {result.kind === 'in' ? <CheckCircle2 className="size-5 text-[#0a192f]" /> : <LogOut className="size-4 text-white" />}
                            </div>
                        </div>
                        <div>
                            <p className={cn('mb-2 text-[10px] font-black tracking-[0.4em] uppercase', result.kind === 'in' ? 'text-[#8a6d10]' : 'text-[#0a192f]')}>{result.kind === 'in' ? '✦ Welcome ✦' : '✦ Goodbye ✦'}</p>
                            <h2 className="mb-1 text-3xl font-black tracking-tight text-[#0a192f]">{me}</h2>
                            <p className={cn('text-sm font-black tracking-widest uppercase', result.kind === 'in' ? 'text-emerald-700' : 'text-[#0a192f]')}>{result.kind === 'in' ? 'Check In Successful' : 'Check Out Successful'}</p>
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 shadow-sm">
                                <Clock aria-hidden className="size-4 text-slate-600" />
                                <span className="text-lg font-bold text-slate-700 tabular-nums" data-testid="att-done-time">{result.time}</span>
                            </div>
                            {result.kind === 'out' && (
                                <div className="mt-3 rounded-full border border-[#0a192f]/15 bg-[#0a192f]/5 px-5 py-2 text-xs font-black tracking-widest text-[#0a192f] uppercase">
                                    In {result.checkIn} · {formatHours(result.hours)} worked
                                </div>
                            )}
                            {result.face && (
                                <div data-testid="att-face" className="mt-3 text-xs font-semibold text-emerald-800">
                                    <div className="flex items-center justify-center gap-1"><CheckCircle2 aria-hidden className="size-3.5" />{result.face.check === 'matched' ? 'Face verified ✓' : result.face.check === 'pin' ? 'Checked with your PIN ✓' : 'Face registered ✓ (first check-in) - next time it must match'}</div>
                                    {result.face.check === 'registered' && <div className="mt-0.5 font-normal text-slate-600">Saved as a match code, used only for Hotel Sky 5 attendance.</div>}
                                </div>
                            )}
                            {(() => {
                                const place = hotelCheck(result.loc);
                                if (place.at === null) return <div data-testid="att-place" className="mt-3 flex items-center justify-center gap-1 text-xs text-amber-800"><MapPin aria-hidden className="size-3.5" />{result.locError} Saved without location.</div>;
                                return place.at
                                    ? <div data-testid="att-place" className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-emerald-800"><MapPin aria-hidden className="size-3.5" />At Hotel Sky 5 ✓ ({formatDistance(place.m)})</div>
                                    : <div data-testid="att-place" className="mt-3 flex items-center justify-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"><MapPin aria-hidden className="size-3.5" />Outside the hotel · {formatDistance(place.m)} away - saved and shown to the manager</div>;
                            })()}
                        </div>
                        <Button variant="outline" className="w-full max-w-xs rounded-2xl border-slate-200 font-bold" onClick={closeDone}>Done</Button>
                        <span className="text-[10px] font-black tracking-widest text-slate-600 uppercase">Back to start in {DONE_SECONDS}s</span>
                    </section>
                )}
            </div>
        </div>
    );
}
