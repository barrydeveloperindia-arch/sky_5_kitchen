import { useState } from 'react';
import { Delete, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// A 4-digit PIN pad (big keys for a phone). onSubmit(pin) returns an error text, or nothing when the PIN was fine.
export default function PinDialog({ open, title, description, onSubmit, onClose }) {
    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            {/* a new title = a new step (e.g. "new PIN" after "current PIN"): start with empty dots */}
            {open && <PinBody key={title} title={title} description={description} onSubmit={onSubmit} />}
        </Dialog>
    );
}

function PinBody({ title, description, onSubmit }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const press = async (d) => {
        if (busy) return;
        setError('');
        const next = (pin + d).slice(0, 4);
        setPin(next);
        if (next.length < 4) return;
        setBusy(true);
        const err = await Promise.resolve(onSubmit(next)).catch(() => 'No internet - the PIN cannot be checked now.');
        setBusy(false);
        if (err) { setError(err); setPin(''); }
    };
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

    return (
        <DialogContent className="ui max-w-xs bg-white text-[#0a192f]" data-testid="pin-dialog"
            onKeyDown={(e) => { if (/^\d$/.test(e.key)) press(e.key); if (e.key === 'Backspace') setPin(p => p.slice(0, -1)); }}>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#0a192f]"><KeyRound className="size-5" />{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            <div className="flex justify-center gap-3 py-1" aria-live="polite" aria-label={`${pin.length} of 4 digits entered`} data-testid="pin-dots">
                {[0, 1, 2, 3].map(i => <span key={i} className={`size-4 rounded-full border-2 border-[#0a192f] ${i < pin.length ? 'bg-[#0a192f]' : ''}`} />)}
            </div>
            {busy && <p className="text-center text-xs font-semibold text-slate-600">Checking…</p>}
            {error && <p role="alert" data-testid="pin-error" className="rounded-lg bg-red-50 p-2 text-center text-sm font-semibold text-red-700">{error}</p>}
            <div className="grid grid-cols-3 gap-2">
                {keys.map((k, i) => (k === '' ? <span key={i} /> : (
                    <button key={i} type="button" disabled={busy} data-testid={k === 'del' ? 'pin-del' : `pin-${k}`}
                        aria-label={k === 'del' ? 'Delete last digit' : k}
                        onClick={() => (k === 'del' ? setPin(p => p.slice(0, -1)) : press(k))}
                        className="grid h-14 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-xl font-black active:bg-[#d4af37]/30 disabled:opacity-50">
                        {k === 'del' ? <Delete className="size-5" /> : k}
                    </button>
                )))}
            </div>
        </DialogContent>
    );
}
