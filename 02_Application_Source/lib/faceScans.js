/**
 * HOTEL SKY 5 - today's face scans from the attendance terminal (the hotel's live board), shown in the
 * OPS Center register next to the phone check-ins. Read only: these rows are never written to the database.
 *
 * Needs VITE_SKY5_BOARD_URL (the attendance server) and VITE_SKY5_BOARD_KEY (the hotel board key) at build
 * time; without them the register simply shows the phone check-ins.
 */
import { useEffect, useState } from 'react';
import { dayKey, isoDate } from './staffAttendance';

export const BOARD_URL = import.meta.env?.VITE_SKY5_BOARD_URL || '';
export const BOARD_KEY = import.meta.env?.VITE_SKY5_BOARD_KEY || '';
const REFRESH_MS = 60000;

// "08:18" (24 h) -> "08:18 AM" (the register's format); '' stays '--'
export function to12h(hhmm) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ''));
    if (!m) return '--';
    const h = Number(m[1]);
    return `${String(h % 12 || 12).padStart(2, '0')}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

// Board reply -> register rows (one per person who scanned in today). Names come from the hotel's own
// staff list by staff ID, so the register shows the same name everywhere.
export function boardToRows(board, registryStaff = [], at = new Date()) {
    const byId = new Map(registryStaff.filter(s => s.staffId).map(s => [s.staffId, s.name]));
    const people = (board?.companies || []).flatMap(c => c.staff || []);
    return people.filter(p => p && p.in).map(p => ({
        id: `face-${p.employeeId}-${isoDate(at)}`,
        staffName: byId.get(p.employeeId) || p.name,
        staffId: p.employeeId,
        date: dayKey(at),
        dateISO: isoDate(at),
        checkIn: to12h(p.in),
        checkOut: p.out ? to12h(p.out) : '--',
        status: p.leave ? 'Leave' : 'Present',
        source: 'face-scan',
        readOnly: true,
    }));
}

// Register rows + face-scan rows. A person with a phone row for the same day keeps it, and the scan is
// shown beside it (both are evidence); counts use unique names (see presentNames).
export function mergeLogs(appLogs, faceRows) {
    return [...appLogs, ...faceRows];
}
export const presentNames = (logs, key) => new Set(logs.filter(l => l.date === key && l.status === 'Present' && l.checkIn && l.checkIn !== '--').map(l => l.staffName));

// Live face scans for today; refreshed every minute; [] when not configured or offline
export function useFaceScans(registryStaff) {
    const [board, setBoard] = useState(null);
    useEffect(() => {
        if (!BOARD_URL || !BOARD_KEY) return undefined;
        let alive = true;
        const load = () => fetch(`${BOARD_URL}/api/tv/board`, { headers: { 'x-tv-key': BOARD_KEY } })
            .then(r => (r.ok ? r.json() : null)).then(b => { if (alive && b) setBoard(b); }).catch(() => {});
        load();
        const t = setInterval(load, REFRESH_MS);
        return () => { alive = false; clearInterval(t); };
    }, []);
    return board ? boardToRows(board, registryStaff) : [];
}
