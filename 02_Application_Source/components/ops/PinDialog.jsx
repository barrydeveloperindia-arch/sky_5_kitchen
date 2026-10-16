import { useEffect, useState } from 'react';
import { Delete, KeyRound, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// A 4-digit PIN pad (big keys for a phone). onSubmit(pin) returns an error text, or nothing when the PIN was fine.
// person / badge show whose PIN it is and what it is for (e.g. "CHECK IN"); after 5 wrong PINs it locks for a minute.
export const MAX_WRONG = 5;
export const LOCK_SECONDS = 60;

export default function PinDialog({ open, title, description, person, badge, onSubmit, onClose }) {
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            {/* a new title = a new step (e.g. "new PIN" after "current PIN"): start with empty dots */}
            {open && <PinBody key={title} title={title} description={description} person={person} badge={badge} onSubmit={onSubmit} />}
        </Dialog>
    );
}

const clock = () => Date.now();   // (outside the component: the time is read when a key is pressed)
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function PinBody({ title, description, person, badge, onSubmit }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [wrong, setWrong] = useState(0);
    const [lockedUntil, setLockedUntil] = useState(0);
    const [now, setNow] = useState(clock);
    const locked = lockedUntil > now;
    useEffect(() => {
        if (!lockedUntil) return undefined;
        const t = setInterval(() => setNow(clock()), 500);
        return () => clearInterval(t);
    }, [lockedUntil]);

    const press = async (d) => {
        if (busy || locked) return;
        setError('');
        const next = (pin + d).slice(0, 4);
        setPin(next);
        if (next.length < 4) return;
        setBusy(true);
        const err = await Promise.resolve(onSubmit(next)).catch(() => 'No internet - the PIN cannot be checked now.');
        setBusy(false);
        if (!err) return;
        setPin('');
        if (/^wrong/i.test(err)) {
            const n = wrong + 1;
            setWrong(n);
            if (n >= MAX_WRONG) { setLockedUntil(clock() + LOCK_SECONDS * 1000); setNow(clock()); setWrong(0); setError(`${MAX_WRONG} wrong PINs. Try again in a minute.`); return; }
            setError(`${err} ${MAX_WRONG - n} ${MAX_WRONG - n === 1 ? 'try' : 'tries'} left.`);
            return;
        }
        setError(err);
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    const wait = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

    return (
        <DialogContent className="ui max-w-xs bg-white text-[#0a192f]" data-testid="pin-dialog"
            onKeyDown={(e) => { if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace') setPin(p => p.slice(0, -1)); }}>
            {person ? (
                <div className="flex flex-col items-center gap-2 pt-1 text-center">
                    <span aria-hidden className="grid size-14 place-items-center rounded-full bg-[#0a192f] text-lg font-black text-[#d4af37] ring-4 ring-[#d4af37]/30">{initials(person)}</span>
                    <DialogTitle className="text-lg font-black text-[#0a192f]">{person}</DialogTitle>
                    {badge && <span data-testid="pin-badge" className="rounded-full bg-[#d4af37]/20 px-3 py-0.5 text-[11px] font-black tracking-widest text-[#5c4708] uppercase">{badge}</span>}
                    <DialogDescription className="text-sm">{description || 'Enter your 4-digit PIN'}</DialogDescription>
                </div>
            ) : (
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#0a192f]"><KeyRound className="size-5" />{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
            )}
            <div role="status" className="flex justify-center gap-3 py-1" aria-live="polite" aria-label={`${pin.length} of 4 digits entered`} data-testid="pin-dots">
                {[0, 1, 2, 3].map(i => <span key={i} className={`size-4 rounded-full border-2 border-[#0a192f] transition-colors ${i < pin.length ? 'bg-[#0a192f]' : ''}`} />)}
            </div>
            {busy && <p className="text-center text-xs font-semibold text-slate-600">Checking…</p>}
            {locked && <p data-testid="pin-locked" className="flex items-center justify-center gap-1.5 text-center text-sm font-bold text-amber-800"><Lock className="size-4" />Locked - try again in {wait}s</p>}
            {error && !locked && <p role="alert" data-testid="pin-error" className="rounded-lg bg-red-50 p-2 text-center text-sm font-semibold text-red-700">{error}</p>}
            <div className="grid grid-cols-3 gap-2">
                {keys.map((k, i) => (k === '' ? <span key={i} /> : (
                    <button key={i} type="button" disabled={busy || locked} data-testid={k === 'del' ? 'pin-del' : `pin-${k}`}
                        aria-label={k === 'del' ? 'Delete last digit' : k}
                        onClick={() => (k === 'del' ? setPin(p => p.slice(0, -1)) : press(k))}
                        className="grid h-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-black active:bg-[#d4af37]/30 disabled:opacity-40">
                        {k === 'del' ? <Delete className="size-5" /> : k}
                    </button>
                )))}
            </div>
            {person && <p className="text-center text-xs text-slate-600">Forgot your PIN? Ask the manager.</p>}
        </DialogContent>
    );
}
