import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { KeyRound, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdminAuth } from '../lib/firebase';

// OPS Center is for the manager only: log in with the admin email + password (Firebase Authentication).
// The password is never in the app or the code - Firebase checks it. Staff and guests stay on the shop / staff app.
export const ADMIN_EMAIL = 'admin@sky5.com';
const isAdmin = (u) => !!u && !u.isAnonymous && String(u.email || '').toLowerCase() === ADMIN_EMAIL;

const reason = (e) => {
    const c = e?.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'Wrong email or password.';
    if (/too-many-requests/.test(c)) return 'Too many tries. Wait a minute and try again.';
    if (/network/.test(c)) return 'No internet. Connect and try again.';
    if (/operation-not-allowed/.test(c)) return 'Admin login is not switched on yet (Firebase → Authentication → Email/Password).';
    return 'Could not log in. Try again.';
};

export default function AdminGate({ children, onCancel, enabled = true }) {
    if (!enabled) return children;
    return <AdminLogin onCancel={onCancel}>{children}</AdminLogin>;
}

function AdminLogin({ children, onCancel }) {
    const auth = getAdminAuth();   // the admin login only - the data connection stays as it is
    const [admin, setAdmin] = useState(() => isAdmin(auth.currentUser));
    // the saved login is read back a moment after the page opens: wait for it instead of flashing the login form
    const [checked, setChecked] = useState(false);
    const [email, setEmail] = useState(ADMIN_EMAIL);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let alive = true;
        const ready = typeof auth.authStateReady === 'function' ? auth.authStateReady() : Promise.resolve();
        ready.then(() => { if (alive) { setAdmin(isAdmin(auth.currentUser)); setChecked(true); } });
        const stop = onAuthStateChanged(auth, u => setAdmin(isAdmin(u)));
        return () => { alive = false; stop(); };
    }, [auth]);

    const logout = async () => {
        await signOut(auth).catch(() => {});
        onCancel();
    };

    if (admin) {
        return (
            <>
                {children}
                <button type="button" onClick={logout} data-testid="admin-logout" aria-label="Log out of the OPS Center"
                    className="fixed right-3 bottom-3 z-50 flex items-center gap-1.5 rounded-full bg-[#0a192f] px-3 py-2 text-xs font-bold text-[#d4af37] shadow-lg ring-1 ring-[#d4af37]/40 max-lg:bottom-20">
                    <LogOut className="size-4" />Log out
                </button>
            </>
        );
    }

    if (!checked) return <div role="status" aria-live="polite" data-testid="admin-checking" className="ui grid min-h-dvh place-items-center bg-[#06101f] text-sm font-bold tracking-widest text-[#cdd5ea]">LOADING…</div>;

    const submit = async (e) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        const mail = email.trim().toLowerCase();
        if (mail !== ADMIN_EMAIL) { setError('Only the hotel admin can open the OPS Center.'); return; }
        setBusy(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, mail, password);
            if (!isAdmin(cred.user)) { await signOut(auth); setError('Only the hotel admin can open the OPS Center.'); }
            setPassword('');
        } catch (err) { setError(reason(err)); } finally { setBusy(false); }
    };

    return (
        <div className="ui grid min-h-dvh place-items-center bg-[#06101f] p-4" data-testid="admin-gate">
            <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 text-[#0a192f] shadow-2xl" aria-labelledby="admin-login-title">
                <div className="mb-5 flex flex-col items-center gap-2 text-center">
                    <div aria-hidden className="rounded-xl border border-[#d4af37]/70 bg-[#0a192f] px-3 py-1.5 text-center font-serif leading-none text-[#d4af37]">
                        <div className="text-[7px] font-semibold tracking-[0.25em] text-white">HOTEL</div><div className="text-lg font-black">SKY 5</div>
                    </div>
                    <h1 id="admin-login-title" className="text-xl font-black">OPS Center login</h1>
                    <p className="text-sm text-slate-600">Admin only - staff, faces, rooms and menu are changed here.</p>
                </div>
                <label className="mb-1 block text-xs font-black tracking-widest text-slate-600 uppercase" htmlFor="admin-email">Admin email</label>
                <div className="relative mb-3">
                    <Mail aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
                    <input id="admin-email" data-testid="admin-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-300 pr-3 pl-9 text-base outline-none focus:border-[#d4af37]" />
                </div>
                <label className="mb-1 block text-xs font-black tracking-widest text-slate-600 uppercase" htmlFor="admin-password">Password</label>
                <div className="relative mb-3">
                    <KeyRound aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
                    <input id="admin-password" data-testid="admin-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
                        className="h-11 w-full rounded-xl border border-slate-300 pr-3 pl-9 text-base outline-none focus:border-[#d4af37]" />
                </div>
                {error && <p role="alert" data-testid="admin-error" className="mb-3 rounded-lg bg-red-50 p-2.5 text-sm font-semibold text-red-700">{error}</p>}
                <Button type="submit" disabled={busy || !password} data-testid="admin-login" className="h-12 w-full rounded-2xl bg-[#0a192f] text-base font-black text-[#d4af37] hover:bg-[#0a192f]/90">
                    {busy ? 'Checking…' : 'Log in'}
                </Button>
                <button type="button" onClick={onCancel} data-testid="admin-cancel" className="mt-3 w-full text-center text-sm font-semibold text-slate-600 underline-offset-4 hover:underline">Back to the hotel app</button>
            </form>
        </div>
    );
}
