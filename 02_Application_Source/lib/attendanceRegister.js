/**
 * HOTEL SKY 5 - the OPS Center attendance register (like the AuraLock "Attendance Registry"):
 * which rows to show for a date range, staff who did not come (Absent / Not in yet), filters, the counts on top.
 * Pure functions - unit tested; the screen only draws what these return.
 */
import { parseShift } from './staffAttendance';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayKeyOf = (d) => `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}`;
const has = (v) => !!v && v !== '--';
const toMin = (t) => {
    const m = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(t || '');
    return m ? ((+m[1] % 12) + (/pm/i.test(m[3]) ? 12 : 0)) * 60 + +m[2] : null;
};

// The day keys ("22-Oct") a range covers. day = the selected day; week = the last 7 days; month = this month so far.
export function rangeDays(scope, selectedDay, now = new Date()) {
    if (scope === 'all') return null;   // everything
    if (scope === 'day') return new Set([selectedDay]);
    const days = new Set();
    const d = new Date(now); d.setHours(12, 0, 0, 0);
    if (scope === 'week') for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() - i); days.add(dayKeyOf(x)); }
    if (scope === 'month') for (let i = 1; i <= d.getDate(); i++) days.add(dayKeyOf(new Date(d.getFullYear(), d.getMonth(), i)));
    return days;
}

// LATE = more than 10 minutes after the start of the person's shift
export function isLate(log, shiftText) {
    const inMin = toMin(log.checkIn), start = parseShift(shiftText)?.start;
    return inMin != null && start != null && inMin - start > 10;
}

// One status per row for the colours and the filter: present | late | absent | notin | leave | pending
export function rowStatus(log, shiftText) {
    if (/leave/i.test(log.status || '')) return 'leave';
    if (/absent/i.test(log.status || '')) return 'absent';
    if (log.status === 'Not in yet') return 'notin';
    if (!has(log.checkIn)) return 'pending';
    return isLate(log, shiftText) ? 'late' : 'present';
}

const sourceOf = (l) => (l.source === 'face-scan' ? 'Face scan (terminal)'
    : l.source === 'staff-web' ? `Phone${l.inFace?.check === 'pin' || l.outFace?.check === 'pin' ? ' (PIN)' : ''}` : 'Manual log');

/**
 * One person, one row per day - the AuraLock rule: the FIRST scan of the day is the check-in, the LAST scan of the
 * day is the check-out, whatever button was pressed and whichever device it was (phone app, PIN, AuraLock tablet).
 * The row that can be opened (photos, location) is the app's own row when there is one.
 */
const clock = (ms) => { const d = new Date(ms); const h = d.getHours(), m = d.getMinutes(); return `${String(((h + 11) % 12) + 1).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
// the moment of a time on a row's day (the saved ISO time when there is one)
const dayStart = (l) => { const d = new Date(l.dateISO ? `${l.dateISO}T00:00:00` : `${l.date}-${new Date().getFullYear()}`); return Number.isFinite(d.getTime()) ? d.getTime() : null; };
const momentOf = (l, label, iso) => { const t = Date.parse(iso || ''); if (Number.isFinite(t)) return t; const s = dayStart(l), m = toMin(label); return s == null || m == null ? null : s + m * 60000; };
export function mergeSameDay(logs) {
    const groups = new Map();
    for (const l of logs) {
        const k = `${String(l.staffName || '').trim().toLowerCase()}|${l.date}`;   // one person (phone rows and tablet rows name them the same)
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(l);
    }
    const out = [];
    for (const list of groups.values()) {
        const main = list.find(l => !l.readOnly) || list[0];
        // every scan of the day: check-ins, check-outs, "back in" scans - as real moments (a night shift ends the next day)
        const scans = [];
        for (const l of list) {
            const tin = has(l.checkIn) ? momentOf(l, l.checkIn, l.inAt) : null;
            if (tin != null) scans.push({ t: tin, row: l, kind: 'in' });
            if (has(l.checkOut)) {
                let tout = momentOf(l, l.checkOut, l.outAt);
                if (tout != null && !l.outAt && tin != null && tout < tin) tout += 86400000;   // out after midnight
                if (tout != null) scans.push({ t: tout, row: l, kind: 'out' });
            }
            for (const b of Array.isArray(l.backs) ? l.backs : []) { const t = Date.parse(b.at || ''); if (Number.isFinite(t)) scans.push({ t, row: l, kind: 'back', b }); }
        }
        const timed = scans.sort((x, y) => x.t - y.t);
        const merged = { ...main, scans: timed.length, sources: [...new Set(list.map(sourceOf))] };
        if (!timed.length) { out.push(list.length === 1 ? list[0] : merged); continue; }
        const first = timed[0], last = timed[timed.length - 1];
        Object.assign(merged, { checkIn: clock(first.t), inAt: new Date(first.t).toISOString(), inPhotoId: first.row.inPhotoId ?? merged.inPhotoId, inLoc: first.row.inLoc ?? merged.inLoc });
        if (timed.length > 1 && last.t !== first.t) {
            const photo = last.kind === 'back' ? last.b.photoId : last.kind === 'out' ? last.row.outPhotoId : last.row.inPhotoId;
            const loc = last.kind === 'back' ? last.b.loc : last.kind === 'out' ? last.row.outLoc : last.row.inLoc;
            Object.assign(merged, { checkOut: clock(last.t), outAt: new Date(last.t).toISOString(), outPhotoId: photo ?? null, outLoc: loc ?? null, hours: (last.t - first.t) / 3600000 });
        } else {
            merged.checkOut = '--';
        }
        merged.status = list.some(l => /leave/i.test(l.status || '')) ? list.find(l => /leave/i.test(l.status || '')).status : 'Present';
        out.push(merged);
    }
    return out;
}

/**
 * Rows for the register: the saved rows in the range (newest first), and - for a single day - one row for every
 * working staff member with nothing that day: "Absent" for a past day, "Not in yet" for today (the day is not over).
 * staff = [{ name, staffId, dept, role, shift }] of people still working.
 */
export function registerRows({ logs, staff, scope, selectedDay, today, now = new Date() }) {
    const days = rangeDays(scope, selectedDay, now);
    const inRange = mergeSameDay(logs.filter(l => !days || days.has(l.date)));
    const year = now.getFullYear();
    const when = (l) => Date.parse(l.inAt || '') || Date.parse(l.dateISO || '') || Date.parse(`${l.date}-${year}`) || Number(l._order) || 0;
    const rows = [...inRange].sort((a, b) => when(b) - when(a));
    if (scope === 'day') {
        const seen = new Set(inRange.map(l => l.staffName));
        for (const s of staff) {
            if (seen.has(s.name)) continue;
            rows.push({ id: `missing-${s.name}-${selectedDay}`, staffName: s.name, staffId: s.staffId, date: selectedDay, checkIn: '--', checkOut: '--',
                status: selectedDay === today ? 'Not in yet' : 'Absent', readOnly: true, missing: true });
        }
    }
    const byName = new Map(staff.map(s => [s.name, s]));
    return rows.map((r, i) => ({ ...r, sr: i + 1, staffId: r.staffId || byName.get(r.staffName)?.staffId || '', dept: byName.get(r.staffName)?.dept || '' }));
}

// Search (name / staff ID), department and status filters; Sr. No. is counted again after filtering
export function filterRows(rows, { search = '', dept = '', status = '' }, shiftOf = () => '') {
    const q = search.trim().toLowerCase();
    return rows.filter(r => (!q || `${r.staffName} ${r.staffId}`.toLowerCase().includes(q))
        && (!dept || r.dept === dept)
        && (!status || rowStatus(r, shiftOf(r.staffName)) === status || (status === 'present' && rowStatus(r, shiftOf(r.staffName)) === 'late')))
        .map((r, i) => ({ ...r, sr: i + 1 }));
}

// The cards on top, for one day: everybody working, in (once per person), late, not here, on leave
export function dayCounts(rows, staffCount, shiftOf = () => '') {
    const people = new Map();
    for (const r of rows) {
        const st = rowStatus(r, shiftOf(r.staffName));
        const prev = people.get(r.staffName);
        // a person with any check-in that day counts as in (a phone row and a face scan are one person)
        if (!prev || ((prev === 'absent' || prev === 'notin' || prev === 'pending') && (st === 'present' || st === 'late'))) people.set(r.staffName, st);
    }
    const n = (s) => [...people.values()].filter(v => v === s).length;
    const present = n('present') + n('late');
    return { total: staffCount, present, late: n('late'), absent: n('absent') + n('notin'), leave: n('leave'), pct: staffCount ? Math.round((present / staffCount) * 100) : 0 };
}
