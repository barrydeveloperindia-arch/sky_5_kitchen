import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { Camera, CheckCircle2, ChevronRight, LogIn, LogOut, MapPin, RefreshCw, Search } from 'lucide-react';
import Logo from './Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getServices, whenSignedIn } from '../lib/firebase';
import { normalizeRegistry } from '../lib/staff';
import { toFirestore, trackWrite } from '../lib/syncedState';
import {
    dayKey, isoDate, staffNames, findActiveLog, nextAction, tapUpdate, logIdFor, toLoc, workedHours, formatHours,
    STAFF_KEY, MAX_PHOTO_CHARS,
} from '../lib/staffAttendance';

const readSaved = () => { try { return localStorage.getItem(STAFF_KEY) || ''; } catch { return ''; } };
const writeSaved = (v) => { try { if (v) localStorage.setItem(STAFF_KEY, v); else localStorage.removeItem(STAFF_KEY); } catch { /* private mode */ } };
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const DEPTS = [['reception', 'Front Desk & Management'], ['kitchen', 'Kitchen'], ['housekeeping', 'Housekeeping']];
const NO_NET = 'No internet. Connect and open the link again.';

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

export default function StaffAttendance() {
    const [registry, setRegistry] = useState(null);
    const [logs, setLogs] = useState([]);
    const [ready, setReady] = useState(false);
    const [me, setMe] = useState(readSaved);
    const [step, setStep] = useState('home'); // home | camera | saving | done
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [search, setSearch] = useState('');
    const [now, setNow] = useState(() => Date.now());
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

    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 5000); return () => clearInterval(t); }, []);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };
    useEffect(() => stopCamera, []);

    const names = registry ? staffNames(registry) : [];
    const known = names.some(n => n.name === me);
    const myRole = names.find(n => n.name === me)?.role || '';
    const shown = names.filter(n => n.name.toLowerCase().includes(search.trim().toLowerCase()));
    const log = findActiveLog(logs, me, new Date(now));
    const nightShift = !!log && log.date !== today;
    const action = nextAction(log, now);
    const inT = log?.checkIn && log.checkIn !== '--' ? log.checkIn : '--';
    const outT = log?.checkOut && log.checkOut !== '--' ? log.checkOut : '--';
    const hint = action === 'out' && outT !== '--' ? 'Leaving later? Tap CHECK OUT again, the last tap counts.'
        : 'A selfie and your location are saved with every tap.';
    const clock = new Date(now);

    const choose = (name) => { setMe(name); writeSaved(name); setError(''); setSearch(''); setStep('home'); };
    const changeName = () => { setMe(''); writeSaved(''); setResult(null); setStep('home'); };

    const openCamera = async () => {
        setError('');
        locRef.current = locate(); // ask for location while the camera opens
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
            streamRef.current = stream;
            setStep('camera');
            requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } });
        } catch {
            setError('Camera permission is needed. Allow the camera for this site and try again (selfie ke bina attendance nahi lagegi).');
        }
    };

    const capture = async () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) { setError('Camera is starting, try again in a second.'); return; }
        const photo = snap(video);
        stopCamera();
        if (!photo) { setError('Photo could not be saved, try again.'); setStep('home'); return; }
        setStep('saving');
        const { loc, error: locError } = await (locRef.current || locate());
        const at = new Date();
        // decide on the tap's own time (not the last screen refresh), so a tap just after midnight is dated correctly
        const row0 = findActiveLog(logs, me, at);
        const kind = nextAction(row0, at.getTime());
        if (kind === 'wait') { setStep('home'); return; }
        const id = row0 ? String(row0.id) : logIdFor(me, isoDate(at));
        const photoId = `${id}-${kind}-${at.getTime()}`;
        const fields = tapUpdate(row0, kind, { at, photoId, loc });
        if (!loc) fields[kind === 'in' ? 'inLocError' : 'outLocError'] = locError;
        const row = row0 ? fields : { id, staffName: me, date: dayKey(at), dateISO: isoDate(at), checkOut: '--', _order: at.getTime(), ...fields };
        try {
            const { db } = getServices();
            await trackWrite(setDoc(doc(db, 'hotel_attendance_photos', photoId), { logId: id, kind, staffName: me, at: at.toISOString(), data: photo }));
            await trackWrite(setDoc(doc(db, 'hotel_attendance', id), toFirestore(row), { merge: true }));
            const saved = { ...(row0 || {}), ...row };
            setResult({ kind, photo, loc, locError, time: kind === 'in' ? saved.checkIn : saved.checkOut, checkIn: saved.checkIn, hours: workedHours(saved) });
            setStep('done');
        } catch {
            setError('Could not save. Check internet and try again.');
            setStep('home');
        }
    };

    return (
        <div className="ui min-h-dvh bg-[#f0f2f5]" data-testid="staff-attendance">
            <header className="bg-[var(--primary-navy)] px-4 py-3">
                <div className="mx-auto flex max-w-md items-center gap-3">
                    <Logo size={34} noBorder />
                    <div className="min-w-0">
                        <div className="text-base font-extrabold tracking-wide text-[var(--accent)]">STAFF ATTENDANCE</div>
                        <div className="truncate text-[11px] text-[#aab4cf]">Hotel Sky 5 · Staff check-in / check-out</div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-md space-y-3 p-4">
                {error && <div role="alert" data-testid="att-error" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</div>}

                {!registry && !error && <p className="p-10 text-center text-sm text-muted-foreground">Loading…</p>}

                {registry && !known && (
                    <section className="space-y-3">
                        <div className="px-1">
                            <h2 className="text-lg font-bold text-primary">Apna naam chuniye</h2>
                            <p className="text-sm text-muted-foreground">Only once. This phone will remember you.</p>
                        </div>
                        {names.length > 8 && (
                            <div className="relative">
                                <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input data-testid="att-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name"
                                    aria-label="Search your name" className="h-11 w-full rounded-xl border bg-card pr-3 pl-9 text-sm shadow-xs outline-none focus:border-primary" />
                            </div>
                        )}
                        {names.length === 0 && <p data-testid="att-no-staff" className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">No staff in the register yet. Ask the manager to add you in OPS Center → Workforce.</p>}
                        {names.length > 0 && shown.length === 0 && <p data-testid="att-no-match" className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">No name matches “{search.trim()}”.</p>}
                        {DEPTS.map(([dept, label]) => {
                            const list = shown.filter(n => n.dept === dept);
                            if (!list.length) return null;
                            return (
                                <div key={dept} className="overflow-hidden rounded-xl border bg-card shadow-xs">
                                    <h3 className="border-b bg-muted/40 px-4 py-2 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</h3>
                                    {list.map(n => (
                                        <button key={n.name} type="button" data-testid={`att-pick-${n.name}`} onClick={() => choose(n.name)}
                                            className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted/40 active:bg-muted">
                                            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(n.name)}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-semibold text-foreground">{n.name}</span>
                                                <span className="block truncate text-xs text-muted-foreground">{n.role || label}</span>
                                            </span>
                                            <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </section>
                )}

                {registry && known && step === 'home' && (
                    <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                        <div className="flex items-center gap-3 border-b px-4 py-3">
                            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{initials(me)}</span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-base font-bold text-primary" data-testid="att-me">{me}</div>
                                {myRole && <div className="truncate text-xs text-muted-foreground">{myRole}</div>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={changeName} data-testid="att-change">Not you?</Button>
                        </div>
                        <div className="space-y-4 p-5">
                            <div className="text-center">
                                <div className="text-4xl font-black tracking-tight text-primary tabular-nums" data-testid="att-clock">{clock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-xs text-muted-foreground">{clock.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            </div>
                            {nightShift && <div data-testid="att-night" className="rounded-lg bg-accent/40 p-2 text-center text-xs font-medium">Night shift from {log.date} is still open: CHECK OUT closes it.</div>}
                            <div className="grid grid-cols-3 divide-x rounded-xl border text-center">
                                <div className="py-2"><div className="text-[10px] font-semibold text-muted-foreground uppercase">In</div><div className={cn('font-bold tabular-nums', inT === '--' ? 'text-muted-foreground' : 'text-success')} data-testid="att-in-time">{inT}</div></div>
                                <div className="py-2"><div className="text-[10px] font-semibold text-muted-foreground uppercase">Out</div><div className={cn('font-bold tabular-nums', outT === '--' ? 'text-muted-foreground' : 'text-warning')} data-testid="att-out-time">{outT}</div></div>
                                <div className="py-2"><div className="text-[10px] font-semibold text-muted-foreground uppercase">Hours</div><div className="font-bold text-primary tabular-nums" data-testid="att-hours">{formatHours(workedHours(log))}</div></div>
                            </div>
                            {!ready ? <p className="text-center text-sm text-muted-foreground">Loading today’s record…</p>
                                : action === 'wait' ? (
                                    <p data-testid="att-wait" className="rounded-xl bg-muted p-4 text-center text-sm font-medium">Saved ✓ You can tap again after 2 minutes.</p>
                                ) : (
                                    <Button data-testid="att-tap" onClick={openCamera}
                                        className={cn('h-16 w-full rounded-xl text-lg font-extrabold tracking-wide text-white shadow-sm', action === 'in' ? 'bg-success hover:bg-success/90' : 'bg-[var(--primary-navy)] hover:bg-[var(--primary-navy)]/90')}>
                                        {action === 'in' ? <><LogIn className="size-6" />CHECK IN</> : <><LogOut className="size-6" />CHECK OUT</>}
                                    </Button>
                                )}
                            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"><Camera aria-hidden className="size-3.5 shrink-0" />{hint}</p>
                        </div>
                    </section>
                )}

                {step === 'camera' && (
                    <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
                        <h2 className="text-center text-base font-bold text-primary">{action === 'in' ? 'Check-in selfie' : 'Check-out selfie'}</h2>
                        <video ref={videoRef} data-testid="att-video" playsInline muted className="aspect-[3/4] w-full -scale-x-100 rounded-xl bg-black object-cover" />
                        <Button data-testid="att-capture" onClick={capture} className="h-14 w-full rounded-xl bg-[var(--accent)] text-lg font-extrabold text-[var(--primary-navy)] hover:bg-[var(--accent)]/90"><Camera className="size-6" />TAKE PHOTO &amp; SAVE</Button>
                        <Button variant="ghost" className="w-full" onClick={() => { stopCamera(); setStep('home'); }}>Cancel</Button>
                    </section>
                )}

                {step === 'saving' && <p data-testid="att-saving" className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" />Saving…</p>}

                {step === 'done' && result && (
                    <section data-testid="att-done" className={cn('space-y-3 rounded-2xl border p-6 text-center shadow-xs', result.kind === 'in' ? 'border-success/30 bg-success/10' : 'bg-card')}>
                        <CheckCircle2 className={cn('mx-auto size-10', result.kind === 'in' ? 'text-success' : 'text-primary')} />
                        <h2 className="text-lg font-extrabold text-primary">{result.kind === 'in' ? 'Check In Successful' : 'Check Out Successful'}</h2>
                        <img src={result.photo} alt="Your selfie" className="mx-auto size-24 -scale-x-100 rounded-full border-4 border-white object-cover shadow" />
                        <div className="font-semibold">{me}</div>
                        <div className="text-3xl font-black text-primary tabular-nums" data-testid="att-done-time">{result.time}</div>
                        {result.kind === 'out' && <div className="text-sm text-muted-foreground">In {result.checkIn} · Worked <b className="text-foreground">{formatHours(result.hours)}</b></div>}
                        <div className={cn('flex items-center justify-center gap-1 text-xs', result.loc ? 'text-muted-foreground' : 'text-warning')}>
                            <MapPin aria-hidden className="size-3.5" />{result.loc ? `Location saved (±${result.loc.acc} m)` : `${result.locError} Saved without location.`}
                        </div>
                        <Button variant="outline" className="w-full rounded-xl" onClick={() => { setResult(null); setStep('home'); }}>Done</Button>
                    </section>
                )}
            </main>
        </div>
    );
}
