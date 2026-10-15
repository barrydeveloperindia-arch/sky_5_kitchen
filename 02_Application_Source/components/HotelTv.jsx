import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { getServices, whenSignedIn } from '../lib/firebase';
import { normalizeRegistry } from '../lib/staff';
import { isoDate } from '../lib/staffAttendance';
import { useFaceScans } from '../lib/faceScans';
import { activeStaff, buildTvBoard, minutesToLabel, formatSpan } from '../lib/tvBoard';
import { StaffPhoto } from './ops/StaffDirectory';
import Logo from './Logo';

// HOTEL SKY 5 staff attendance board for the TV (/tv). Read only: it never writes anything.
// Phone check-ins + face scans from the hotel tablet, first IN / last OUT, late by each person's shift.
const DEPT = { reception: 'Front desk', kitchen: 'Kitchen', housekeeping: 'Housekeeping' };
const STATUS = {
    Present: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40',
    Late: 'bg-amber-500/15 text-amber-300 ring-amber-400/40',
    'Checked out': 'bg-sky-500/15 text-sky-200 ring-sky-300/40',
    'On leave': 'bg-violet-500/15 text-violet-200 ring-violet-300/40',
    'Not in yet': 'bg-white/5 text-slate-300 ring-white/15',
};

function useNow() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
    return now;
}

export default function HotelTv() {
    const now = useNow();
    const [registry, setRegistry] = useState(null);
    const [logs, setLogs] = useState([]);
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

    useEffect(() => {
        document.title = 'Hotel Sky 5 · Staff attendance';
        const on = () => setOnline(true), off = () => setOnline(false);
        window.addEventListener('online', on); window.addEventListener('offline', off);
        // keep the TV screen awake where the browser allows it
        let lock = null;
        navigator.wakeLock?.request?.('screen').then(l => { lock = l; }).catch(() => {});
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); lock?.release?.().catch(() => {}); };
    }, []);

    useEffect(() => {
        const unsubs = [];
        let alive = true;
        whenSignedIn().then(() => {
            if (!alive) return;
            const { db } = getServices();
            unsubs.push(onSnapshot(doc(db, 'hotel_state', 'staffRegistry'), s => { if (s.exists()) setRegistry(normalizeRegistry(s.data().value)); }, () => {}));
            unsubs.push(onSnapshot(collection(db, 'hotel_attendance'), s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => {}));
        });
        return () => { alive = false; unsubs.forEach(u => u()); };
    }, []);

    const staff = useMemo(() => (registry ? activeStaff(registry) : []), [registry]);
    const faceRows = useFaceScans(staff);
    const todayISO = isoDate(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const board = useMemo(() => buildTvBoard({ staff, logs, faceRows, todayISO, nowMin }), [staff, logs, faceRows, todayISO, nowMin]);
    // every row always fits on the screen: rows share the height, the text follows the row size
    const n = Math.max(board.rows.length, 1);
    const rowFont = Math.min(2.6, Math.max(1.3, 26 / n));   // vh
    const photo = `${Math.min(5, rowFont * 1.9)}vh`;

    const tiles = [
        ['Staff', board.counts.staff, 'on the list', 'text-white', 'border-white/30', 'tv-staff'],
        ['Present', board.counts.present, `${board.counts.onTime} on time`, 'text-emerald-300', 'border-emerald-400/70', 'tv-present'],
        ['Late', board.counts.late, 'after their shift start', 'text-amber-300', 'border-amber-400/70', 'tv-late'],
        ['Not in yet', board.counts.notIn, 'no check-in', 'text-rose-300', 'border-rose-400/70', 'tv-notin'],
        ['Checked out', board.counts.out, 'left for now', 'text-sky-200', 'border-sky-300/70', 'tv-out'],
    ];

    return (
        <div data-testid="hotel-tv" className="ui flex h-dvh flex-col gap-[1.6vh] overflow-hidden bg-[#0a192f] p-[2vh] text-white">
            {/* not <header>: the shop CSS styles every header (white, sticky) */}
            <div role="banner" className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-[1.5vw]">
                    <Logo size={Math.round(Math.min(64, window.innerHeight * 0.07))} />
                    <div>
                        <h1 className="text-[3.6vh] leading-tight font-black tracking-wide">HOTEL SKY 5 · STAFF ATTENDANCE</h1>
                        <p className="text-[1.7vh] text-slate-200">5th Floor, Disha Arcade, MDC Sector 4, Panchkula · Live board</p>
                    </div>
                </div>
                <div className="text-right">
                    <div data-testid="tv-clock" className="text-[5.2vh] leading-none font-black tabular-nums">{now.toLocaleTimeString('en-GB', { hour12: false })}</div>
                    <div className="mt-[0.6vh] text-[1.8vh] text-[#f0d77a]">{now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
                </div>
            </div>

            <section className="grid grid-cols-5 gap-[1vw]">
                {tiles.map(([label, value, sub, color, border, id]) => (
                    <div key={id} className={`rounded-2xl border-t-4 ${border} bg-white/[0.06] px-[1vw] py-[1.2vh] text-center`}>
                        <div data-testid={id} className={`text-[5vh] leading-none font-black tabular-nums ${color}`}>{value}</div>
                        <div className={`mt-[0.6vh] text-[1.8vh] font-black tracking-widest uppercase ${color}`}>{label}</div>
                        <div className="text-[1.4vh] text-slate-300">{sub}</div>
                    </div>
                ))}
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                <div className={`grid shrink-0 grid-cols-[4vw_8vw_1fr_10vw_10vw_10vw_13vw] items-center gap-[1vw] border-b border-white/10 bg-white/[0.06] px-[1.2vw] py-[1vh] text-[1.5vh] font-black tracking-widest text-slate-300 uppercase`}>
                    <span /><span>ID</span><span>Name</span><span className="text-center">In</span><span className="text-center">Out</span><span className="text-center">Hours</span><span className="text-right">Status</span>
                </div>
                {!registry && <p className="p-[4vh] text-center text-[2.4vh] text-slate-300">Loading…</p>}
                {board.rows.map((r, i) => (
                    <div key={r.id} data-testid={`tv-row-${r.name}`} style={{ fontSize: `${rowFont}vh`, maxHeight: '9vh' }}
                        className={`grid min-h-0 flex-1 grid-cols-[4vw_8vw_1fr_10vw_10vw_10vw_13vw] items-center gap-[1vw] px-[1.2vw] ${i % 2 ? 'bg-white/[0.025]' : ''} ${r.in == null ? 'text-slate-400' : ''}`}>
                        <span style={{ width: photo, height: photo }} className="grid"><StaffPhoto staff={r} className="size-full text-[0.6em]" /></span>
                        <span className="font-mono text-[0.8em] text-[#e6c65c]">{r.staffId || '—'}</span>
                        <span className="min-w-0 truncate"><b className={r.in == null ? 'font-semibold' : 'font-black text-white'}>{r.name}</b> <span className="text-[0.7em] text-slate-400">· {r.role || DEPT[r.department]}</span></span>
                        <span data-testid={`tv-in-${r.name}`} className={`text-center font-bold tabular-nums ${r.late ? 'text-amber-300' : r.in != null ? 'text-emerald-300' : ''}`}>{minutesToLabel(r.in)}</span>
                        <span data-testid={`tv-out-${r.name}`} className="text-center font-bold tabular-nums">{minutesToLabel(r.out)}</span>
                        <span className={`text-center tabular-nums ${r.sofar ? 'italic text-slate-300' : ''}`}>{formatSpan(r.minutes)}</span>
                        <span className="text-right"><span data-testid={`tv-status-${r.name}`} className={`inline-block rounded-full px-[1vw] py-[0.4vh] text-[0.75em] font-black ring-1 ${STATUS[r.status]}`}>{r.status}</span></span>
                    </div>
                ))}
            </section>

            <div role="contentinfo" className="flex items-center gap-[1.2vw] rounded-2xl bg-white/[0.06] px-[1.2vw] py-[1vh] text-[2vh]">
                <span className="font-black tracking-widest text-[#e6c65c]">LATEST</span>
                <span data-testid="tv-latest" className="min-w-0 flex-1 truncate">
                    {board.latest.length === 0 ? <span className="text-slate-400">No check-in yet today</span>
                        : board.latest.map((e, i) => <span key={i} className="mr-[2vw]"><b>{e.name}</b> <span className={e.kind === 'in' ? 'text-emerald-300' : 'text-sky-200'}>{e.kind === 'in' ? 'IN' : 'OUT'} {minutesToLabel(e.min)}</span></span>)}
                </span>
                <span data-testid="tv-online" className={`text-[1.6vh] font-bold ${online ? 'text-emerald-300' : 'text-amber-300'}`}>{online ? '● Live' : '● Offline - showing the last data'}</span>
            </div>
        </div>
    );
}
