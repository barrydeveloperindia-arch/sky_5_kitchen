import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { Camera, CheckCircle2, LogIn, LogOut, MapPin, RefreshCw, UserRound } from 'lucide-react';
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
    const [now, setNow] = useState(() => Date.now());
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const locRef = useRef(null);
    const today = dayKey(new Date(now));
    const yesterday = dayKey(new Date(now - 86400000));

    // Staff list + today's register rows, live (read only: this page never edits the registry)
    useEffect(() => {
        let unsubs = [];
        let alive = true;
        whenSignedIn().then(() => {
            if (!alive) return;
            const { db } = getServices();
            unsubs.push(onSnapshot(doc(db, 'hotel_state', 'staffRegistry'), s => setRegistry(normalizeRegistry(s.exists() ? s.data().value : {})),
                () => setError('No internet. Connect and open the link again.')));
            unsubs.push(onSnapshot(query(collection(db, 'hotel_attendance'), where('date', 'in', [today, yesterday])), s => {
                setLogs(s.docs.map(d => d.data()));
                setReady(true);
            }, () => setError('No internet. Connect and open the link again.')));
        });
        return () => { alive = false; unsubs.forEach(u => u()); };
    }, [today, yesterday]);

    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };
    useEffect(() => stopCamera, []);

    const names = registry ? staffNames(registry) : [];
    const known = names.some(n => n.name === me);
    const log = findActiveLog(logs, me, new Date(now));
    const nightShift = !!log && log.date !== today;
    const action = nextAction(log, now);

    const choose = (name) => { setMe(name); writeSaved(name); setError(''); setStep('home'); };
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
        const kind = nextAction(log, at.getTime());
        if (kind === 'wait') { setStep('home'); return; }
        const id = log ? String(log.id) : logIdFor(me);
        const photoId = `${id}-${kind}-${at.getTime()}`;
        const fields = tapUpdate(log, kind, { at, photoId, loc });
        if (!loc) fields[kind === 'in' ? 'inLocError' : 'outLocError'] = locError;
        const row = log ? fields : { id, staffName: me, date: today, dateISO: isoDate(at), checkOut: '--', _order: at.getTime(), ...fields };
        try {
            const { db } = getServices();
            await trackWrite(setDoc(doc(db, 'hotel_attendance_photos', photoId), { logId: id, kind, staffName: me, at: at.toISOString(), data: photo }));
            await trackWrite(setDoc(doc(db, 'hotel_attendance', id), toFirestore(row), { merge: true }));
            const saved = { ...(log || {}), ...row };
            setResult({ kind, photo, loc, locError, time: kind === 'in' ? saved.checkIn : saved.checkOut, checkIn: saved.checkIn, hours: workedHours(saved) });
            setStep('done');
        } catch {
            setError('Could not save. Check internet and try again.');
            setStep('home');
        }
    };

    return (
        <div className="ui min-h-dvh bg-[#f0f2f5]" data-testid="staff-attendance">
            <header className="flex items-center gap-3 bg-[var(--primary-navy)] px-4 py-3">
                <Logo size={36} noBorder />
                <div>
                    <div className="text-base font-extrabold tracking-wide text-[var(--accent)]">ATTENDANCE</div>
                    <div className="text-[11px] text-[#8892b0]">Hotel Sky 5 · Staff check-in / check-out</div>
                </div>
            </header>

            <main className="mx-auto max-w-md space-y-4 p-4">
                {error && <div role="alert" data-testid="att-error" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</div>}

                {!registry && !error && <p className="p-8 text-center text-muted-foreground">Loading…</p>}

                {registry && !known && (
                    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                        <h2 className="text-lg font-bold text-primary">Apna naam chuniye</h2>
                        <p className="text-sm text-muted-foreground">Choose your name once. This phone will remember it.</p>
                        {names.length === 0 && <p data-testid="att-no-staff" className="text-sm text-muted-foreground">No staff in the register yet. Ask the manager to add you in OPS Center → Workforce.</p>}
                        <div className="grid gap-2">
                            {names.map(n => (
                                <Button key={n.name} variant="outline" className="h-auto justify-start py-3 text-left" data-testid={`att-pick-${n.name}`} onClick={() => choose(n.name)}>
                                    <UserRound className="text-primary" />
                                    <span className="flex flex-col"><span className="font-semibold">{n.name}</span><span className="text-xs text-muted-foreground">{n.role || n.dept}</span></span>
                                </Button>
                            ))}
                        </div>
                    </section>
                )}

                {registry && known && step === 'home' && (
                    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <div className="text-xs font-semibold text-muted-foreground uppercase">Staff</div>
                                <div className="text-xl font-bold text-primary" data-testid="att-me">{me}</div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={changeName} data-testid="att-change">Not you?</Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                            <div><div className="text-[11px] text-muted-foreground uppercase">Check-in</div><div className="font-bold text-success" data-testid="att-in-time">{log?.checkIn && log.checkIn !== '--' ? log.checkIn : '--'}</div></div>
                            <div><div className="text-[11px] text-muted-foreground uppercase">Check-out</div><div className="font-bold text-warning" data-testid="att-out-time">{log?.checkOut && log.checkOut !== '--' ? log.checkOut : '--'}</div></div>
                            <div><div className="text-[11px] text-muted-foreground uppercase">Hours</div><div className="font-bold text-primary">{formatHours(workedHours(log))}</div></div>
                        </div>
                        {nightShift && <div data-testid="att-night" className="rounded-md bg-accent/40 p-2 text-center text-xs font-medium">Night shift from {log.date} is still open: CHECK OUT closes it.</div>}
                        <div className="text-center text-xs text-muted-foreground">Today · {new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        {!ready ? <p className="text-center text-sm text-muted-foreground">Loading today’s record…</p>
                            : action === 'wait' ? (
                                <p data-testid="att-wait" className="rounded-lg bg-muted p-3 text-center text-sm font-medium">Saved just now. You can tap again after 2 minutes.</p>
                            ) : (
                                <Button data-testid="att-tap" onClick={openCamera}
                                    className={cn('h-16 w-full text-lg font-extrabold tracking-wide text-white', action === 'in' ? 'bg-success hover:bg-success/90' : 'bg-[var(--primary-navy)] hover:bg-[var(--primary-navy)]/90')}>
                                    {action === 'in' ? <><LogIn className="size-6" />CHECK IN</> : <><LogOut className="size-6" />CHECK OUT</>}
                                </Button>
                            )}
                        {action === 'out' && log?.checkOut && log.checkOut !== '--' && <p className="text-center text-xs text-muted-foreground">Leaving later? Tap CHECK OUT again, the last one of the day counts.</p>}
                        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Camera className="size-3.5" />A selfie and your location are saved with every tap.</p>
                    </section>
                )}

                {step === 'camera' && (
                    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
                        <h2 className="text-center text-lg font-bold text-primary">{action === 'in' ? 'Check-in selfie' : 'Check-out selfie'}</h2>
                        <video ref={videoRef} data-testid="att-video" playsInline muted className="aspect-[3/4] w-full -scale-x-100 rounded-lg bg-black object-cover" />
                        <Button data-testid="att-capture" onClick={capture} className="h-14 w-full bg-[var(--accent)] text-lg font-extrabold text-[var(--primary-navy)] hover:bg-[var(--accent)]/90"><Camera className="size-6" />TAKE PHOTO &amp; SAVE</Button>
                        <Button variant="ghost" className="w-full" onClick={() => { stopCamera(); setStep('home'); }}>Cancel</Button>
                    </section>
                )}

                {step === 'saving' && <p data-testid="att-saving" className="flex items-center justify-center gap-2 p-8 text-muted-foreground"><RefreshCw className="size-4 animate-spin" />Saving…</p>}

                {step === 'done' && result && (
                    <section data-testid="att-done" className={cn('space-y-4 rounded-xl border p-5 text-center shadow-xs', result.kind === 'in' ? 'border-success/30 bg-success/10' : 'border-primary/20 bg-card')}>
                        <CheckCircle2 className={cn('mx-auto size-12', result.kind === 'in' ? 'text-success' : 'text-primary')} />
                        <h2 className="text-xl font-extrabold text-primary">{result.kind === 'in' ? 'Check In Successful' : 'Check Out Successful'}</h2>
                        <img src={result.photo} alt="Your selfie" className="mx-auto size-28 -scale-x-100 rounded-full border-4 border-white object-cover shadow" />
                        <div className="text-lg font-bold">{me}</div>
                        <div className="text-3xl font-black text-primary" data-testid="att-done-time">{result.time}</div>
                        {result.kind === 'out' && <div className="text-sm">In {result.checkIn} · Worked <b>{formatHours(result.hours)}</b></div>}
                        <div className={cn('flex items-center justify-center gap-1 text-xs', result.loc ? 'text-muted-foreground' : 'text-warning')}>
                            <MapPin className="size-3.5" />{result.loc ? `Location saved (±${result.loc.acc} m)` : `${result.locError} Saved without location.`}
                        </div>
                        <Button variant="outline" className="w-full" onClick={() => { setResult(null); setStep('home'); }}>Done</Button>
                    </section>
                )}
            </main>
        </div>
    );
}
