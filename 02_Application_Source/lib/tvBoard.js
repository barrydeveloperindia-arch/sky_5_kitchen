/**
 * HOTEL SKY 5 - the staff attendance TV board (/tv): one line per person still working, today.
 * Phone check-ins (hotel_attendance) and face scans from the hotel tablet are put together:
 * the first check-in of the day and the last check-out count (the same rule as AuraLock).
 * Late = more than 10 minutes after the person's own shift start (as in the OPS Center register).
 */
import { parseShift } from './staff';

const DEPTS = ['reception', 'kitchen', 'housekeeping'];
export const LATE_AFTER_MIN = 10;

// "08:03 AM" -> 483 (minutes since midnight); anything else -> null
export function labelToMinutes(label) {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(label || '').trim());
    if (!m) return null;
    return (Number(m[1]) % 12 + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + Number(m[2]);
}
export const minutesToLabel = (min) => (min == null ? '--'
    : `${String(Math.floor(min / 60) % 12 || 12).padStart(2, '0')}:${String(min % 60).padStart(2, '0')} ${min < 720 ? 'AM' : 'PM'}`);
export const formatSpan = (min) => (min == null || min < 0 ? '--' : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`);

// Everyone still working (people who left are not on the board), in department order
export function activeStaff(registry) {
    return DEPTS.flatMap(d => (registry?.[d] || []).filter(s => s && s.name && s.status !== 'Left').map(s => ({ ...s, department: d })));
}

/**
 * @param staff     activeStaff(registry)
 * @param logs      hotel_attendance records (phone check-ins and manager logs); deleted ones are skipped
 * @param faceRows  today's face scans from the hotel tablet (lib/faceScans boardToRows)
 * @param todayISO  'YYYY-MM-DD' of the board's day, nowMin = minutes since midnight now
 */
export function buildTvBoard({ staff, logs = [], faceRows = [], todayISO, nowMin }) {
    const events = [];
    const rows = staff.map(s => {
        const mine = [
            ...logs.filter(l => !l.deleted && l.dateISO === todayISO && (l.staffName === s.name || (s.staffId && l.staffId === s.staffId))),
            ...faceRows.filter(f => f.dateISO === todayISO && ((s.staffId && f.staffId === s.staffId) || f.staffName === s.name)),
        ];
        const ins = mine.map(l => labelToMinutes(l.checkIn)).filter(m => m != null);
        const outs = mine.map(l => labelToMinutes(l.checkOut)).filter(m => m != null);
        const leave = mine.some(l => /leave/i.test(l.status || ''));
        for (const l of mine) {
            const a = labelToMinutes(l.checkIn), b = labelToMinutes(l.checkOut);
            const how = l.source === 'face-scan' ? 'tablet' : 'phone';
            if (a != null) events.push({ name: s.name, kind: 'in', min: a, how });
            if (b != null) events.push({ name: s.name, kind: 'out', min: b, how });
        }
        const first = ins.length ? Math.min(...ins) : null;
        const lastOut = outs.filter(m => first == null || m > first);
        const last = lastOut.length ? Math.max(...lastOut) : null;
        const shift = parseShift(s.shift);
        const late = first != null && shift != null && first - shift.start > LATE_AFTER_MIN;
        const status = first == null ? (leave ? 'On leave' : 'Not in yet') : last != null ? 'Checked out' : late ? 'Late' : 'Present';
        return {
            id: s.id, staffId: s.staffId || '', name: s.name, role: s.role || '', department: s.department, photoId: s.photoId, photo: s.photo,
            in: first, out: last, late,
            minutes: first == null ? null : (last ?? nowMin) - first,
            sofar: first != null && last == null,
            status,
        };
    });
    const counts = {
        staff: rows.length,
        present: rows.filter(r => r.in != null).length,
        onTime: rows.filter(r => r.in != null && !r.late).length,
        late: rows.filter(r => r.late).length,
        notIn: rows.filter(r => r.status === 'Not in yet').length,
        leave: rows.filter(r => r.status === 'On leave').length,
        out: rows.filter(r => r.status === 'Checked out').length,
    };
    // newest first, each person-time-kind once (a phone tap and a tablet scan at the same minute are one)
    const seen = new Set();
    const latest = events.sort((a, b) => b.min - a.min).filter(e => { const k = `${e.name}|${e.kind}|${e.min}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
    return { rows, counts, latest };
}
