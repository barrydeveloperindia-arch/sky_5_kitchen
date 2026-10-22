import { describe, it, expect } from 'vitest';
import { rangeDays, isLate, rowStatus, registerRows, filterRows, dayCounts, dayKeyOf, mergeSameDay, dailyTrend } from '../../02_Application_Source/lib/attendanceRegister';

const now = new Date(2026, 9, 22, 12, 0);   // 22 Oct 2026
const staff = [
    { name: 'Varun', staffId: 'SKY5-004', dept: 'Kitchen', shift: '07:00 AM - 11:00 AM' },
    { name: 'Ganga', staffId: 'SKY5-006', dept: 'Reception', shift: '7:00am to 18:000pm' },
    { name: 'Bhawna', staffId: 'SKY5-013', dept: 'Housekeeping', shift: '' },
];
const shiftOf = (n) => staff.find(s => s.name === n)?.shift || '';

describe('date ranges', () => {
    it('day, last 7 days, this month so far, everything', () => {
        expect([...rangeDays('day', '20-Oct', now)]).toEqual(['20-Oct']);
        const week = rangeDays('week', '22-Oct', now);
        expect(week.size).toBe(7);
        expect(week.has('22-Oct') && week.has('16-Oct') && !week.has('15-Oct')).toBe(true);
        const month = rangeDays('month', '22-Oct', now);
        expect(month.size).toBe(22);
        expect(month.has('01-Oct') && month.has('22-Oct') && !month.has('23-Oct')).toBe(true);
        expect(rangeDays('all', '22-Oct', now)).toBe(null);
        expect(dayKeyOf(new Date(2026, 0, 5))).toBe('05-Jan');
    });
});

describe('late and status', () => {
    it('late = more than 10 minutes after the shift start (typed any way)', () => {
        expect(isLate({ checkIn: '07:10 AM' }, '07:00 AM - 11:00 AM')).toBe(false);
        expect(isLate({ checkIn: '07:11 AM' }, '07:00 AM - 11:00 AM')).toBe(true);
        expect(isLate({ checkIn: '08:58 AM' }, '7:00am to 18:000pm')).toBe(true);
        expect(isLate({ checkIn: '08:58 AM' }, 'Flexible')).toBe(false);
        expect(isLate({ checkIn: '09:48 AM' }, '09:00 to 6:00pm')).toBe(true);   // the old reading took 6 PM as the start
    });
    it('one status per row', () => {
        expect(rowStatus({ checkIn: '07:00 AM', status: 'Present' }, '07:00 AM - 11:00 AM')).toBe('present');
        expect(rowStatus({ checkIn: '08:00 AM', status: 'Present' }, '07:00 AM - 11:00 AM')).toBe('late');
        expect(rowStatus({ checkIn: '--', status: 'Absent' }, '')).toBe('absent');
        expect(rowStatus({ checkIn: '--', status: 'Not in yet' }, '')).toBe('notin');
        expect(rowStatus({ checkIn: '--', status: 'Half-Day Leave' }, '')).toBe('leave');
        expect(rowStatus({ checkIn: '--', status: 'Pending' }, '')).toBe('pending');
    });
});

describe('register rows', () => {
    const logs = [
        { id: 'a', staffName: 'Varun', date: '22-Oct', inAt: '2026-10-22T02:29:00Z', checkIn: '07:59 AM', checkOut: '--', status: 'Present' },
        { id: 'b', staffName: 'Ganga', date: '21-Oct', inAt: '2026-10-21T03:28:00Z', checkIn: '08:58 AM', checkOut: '06:00 PM', status: 'Present' },
        { id: 'c', staffName: 'Varun', date: '20-Oct', inAt: '2026-10-20T02:00:00Z', checkIn: '07:30 AM', checkOut: '05:00 PM', status: 'Present' },
    ];
    it('today: the people with nothing yet are "Not in yet" (not absent - the day is not over)', () => {
        const rows = registerRows({ logs, staff, scope: 'day', selectedDay: '22-Oct', today: '22-Oct', now });
        expect(rows.map(r => [r.sr, r.staffName, r.status, r.staffId])).toEqual([
            [1, 'Varun', 'Present', 'SKY5-004'], [2, 'Ganga', 'Not in yet', 'SKY5-006'], [3, 'Bhawna', 'Not in yet', 'SKY5-013']]);
    });
    it('a past day: the people with nothing are Absent; only working staff are listed', () => {
        const rows = registerRows({ logs, staff, scope: 'day', selectedDay: '21-Oct', today: '22-Oct', now });
        expect(rows.find(r => r.staffName === 'Varun').status).toBe('Absent');
        expect(rows.find(r => r.staffName === 'Ganga').status).toBe('Present');
        expect(rows.filter(r => r.missing)).toHaveLength(2);
    });
    it('a week: saved rows only, newest first, numbered', () => {
        const rows = registerRows({ logs, staff, scope: 'week', selectedDay: '22-Oct', today: '22-Oct', now });
        expect(rows.map(r => r.id)).toEqual(['a', 'b', 'c']);
        expect(rows.map(r => r.sr)).toEqual([1, 2, 3]);
        expect(rows.some(r => r.missing)).toBe(false);
    });
    it('filters: name or ID, department, status (late counts as present), Sr. No. again from 1', () => {
        const rows = registerRows({ logs, staff, scope: 'day', selectedDay: '22-Oct', today: '22-Oct', now });
        expect(filterRows(rows, { search: 'sky5-013' }, shiftOf).map(r => [r.sr, r.staffName])).toEqual([[1, 'Bhawna']]);
        expect(filterRows(rows, { dept: 'Kitchen' }, shiftOf).map(r => r.staffName)).toEqual(['Varun']);
        expect(filterRows(rows, { status: 'late' }, shiftOf).map(r => r.staffName)).toEqual(['Varun']);
        expect(filterRows(rows, { status: 'present' }, shiftOf).map(r => r.staffName)).toEqual(['Varun']);
        expect(filterRows(rows, { status: 'notin' }, shiftOf).map(r => r.staffName)).toEqual(['Ganga', 'Bhawna']);
    });
    it('counts: each person once (phone row + face scan), late is part of present', () => {
        const rows = registerRows({ logs: [...logs, { id: 'f', staffName: 'Varun', date: '22-Oct', checkIn: '08:01 AM', checkOut: '--', status: 'Present', readOnly: true }], staff, scope: 'day', selectedDay: '22-Oct', today: '22-Oct', now });
        expect(dayCounts(rows, 3, shiftOf)).toEqual({ total: 3, present: 1, late: 1, absent: 2, leave: 0, pct: 33 });
    });
});

describe('one person, one row per day (phone app + AuraLock tablet)', () => {
    it('first check-in and last check-out of both, sources listed, the app row is the one kept', () => {
        const rows = mergeSameDay([
            { id: 'p', staffName: 'Varun', staffId: 'SKY5-004', date: '22-Oct', checkIn: '07:59 AM', checkOut: '--', status: 'Present', source: 'staff-web', inFace: { check: 'pin' } },
            { id: 'f', staffName: 'Varun', staffId: 'SKY5-004', date: '22-Oct', checkIn: '11:45 AM', checkOut: '06:10 PM', status: 'Present', source: 'face-scan', readOnly: true },
            { id: 'g', staffName: 'Ganga', date: '22-Oct', checkIn: '08:58 AM', checkOut: '--', status: 'Present', source: 'staff-web' },
        ]);
        expect(rows).toHaveLength(2);
        const v = rows.find(r => r.staffName === 'Varun');
        expect(v).toMatchObject({ id: 'p', checkIn: '07:59 AM', checkOut: '06:10 PM', status: 'Present', scans: 3 });
        expect(v.sources).toEqual(['Phone (PIN)', 'Face scan (terminal)']);
        expect(v.hours).toBeCloseTo(10 + 11 / 60, 5);
    });
    it('first scan = check-in, LAST scan = check-out, whatever was pressed (a later CHECK IN scan too)', () => {
        const [v] = mergeSameDay([
            { id: 'p', staffName: 'Varun', date: '22-Oct', checkIn: '07:59 AM', checkOut: '--', status: 'Present', source: 'staff-web' },
            { id: 'f', staffName: 'Varun', date: '22-Oct', checkIn: '11:45 AM', checkOut: '--', status: 'Present', source: 'face-scan', readOnly: true },
        ]);
        expect(v).toMatchObject({ checkIn: '07:59 AM', checkOut: '11:45 AM', scans: 2 });
        expect(v.hours).toBeCloseTo(3 + 46 / 60, 5);
        // one row with a back-in after a check-out: the back-in is the last scan
        const backAt = new Date(2026, 9, 22, 15, 20).toISOString();
        const [w] = mergeSameDay([{ id: 'w', staffName: 'Ganga', date: '22-Oct', checkIn: '09:00 AM', checkOut: '--', status: 'Present', source: 'staff-web', backs: [{ at: backAt, afterOut: '01:00 PM' }] }]);
        expect(w).toMatchObject({ checkIn: '09:00 AM', checkOut: '03:20 PM' });
        // a single scan: still in, no check-out yet
        const [x] = mergeSameDay([{ id: 'x', staffName: 'Bhawna', date: '22-Oct', checkIn: '08:30 AM', checkOut: '--', status: 'Present' }]);
        expect(x.checkOut).toBe('--');
    });
    it('the register shows Varun once and counts him once', () => {
        const logs = [
            { id: 'p', staffName: 'Varun', date: '22-Oct', checkIn: '07:59 AM', checkOut: '--', status: 'Present', source: 'staff-web' },
            { id: 'f', staffName: 'Varun', date: '22-Oct', checkIn: '11:45 AM', checkOut: '--', status: 'Present', source: 'face-scan', readOnly: true },
        ];
        const rows = registerRows({ logs, staff, scope: 'day', selectedDay: '22-Oct', today: '22-Oct', now });
        expect(rows.filter(r => r.staffName === 'Varun')).toHaveLength(1);
        expect(dayCounts(rows, 3, shiftOf).present).toBe(1);
    });
});

describe('15-day trend', () => {
    it('one point per day, oldest first; people counted once; late counted too; empty days are 0', () => {
        const logs = [
            { staffName: 'Varun', date: '22-Oct', checkIn: '07:59 AM', checkOut: '--', status: 'Present' },
            { staffName: 'Varun', date: '22-Oct', checkIn: '11:45 AM', checkOut: '--', status: 'Present', readOnly: true },
            { staffName: 'Ganga', date: '22-Oct', checkIn: '06:55 AM', checkOut: '--', status: 'Present' },
            { staffName: 'Ganga', date: '20-Oct', checkIn: '07:05 AM', checkOut: '05:00 PM', status: 'Present' },
            { staffName: 'Bhawna', date: '20-Oct', checkIn: '--', checkOut: '--', status: 'Absent' },
            { staffName: 'Varun', date: '06-Oct', checkIn: '07:00 AM', checkOut: '--', status: 'Present' },   // older than 15 days
        ];
        const t = dailyTrend(logs, staff, 15, now);
        expect(t).toHaveLength(15);
        expect(t[0].key).toBe('08-Oct');
        expect(t[14]).toMatchObject({ key: '22-Oct', present: 2, late: 1 });   // Varun late (shift 07:00), Ganga on time
        expect(t[12]).toMatchObject({ key: '20-Oct', present: 1, late: 0 });
        expect(t[13]).toMatchObject({ key: '21-Oct', present: 0, late: 0 });
    });
});
