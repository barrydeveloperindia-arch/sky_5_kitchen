import { describe, test, expect } from 'vitest';
import { buildTvBoard, activeStaff, labelToMinutes, minutesToLabel, formatSpan } from '../../02_Application_Source/lib/tvBoard';

const registry = {
    reception: [{ id: 'R1', staffId: 'SKY5-001', name: 'Larissa', role: 'CEO', shift: '' }, { id: 'R2', staffId: 'SKY5-008', name: 'Gaurav', status: 'Left' }],
    kitchen: [{ id: 'K1', staffId: 'SKY5-004', name: 'Varun', role: 'Waiter', shift: '07:00 AM – 11:00 AM' }],
    housekeeping: [{ id: 'H1', staffId: 'SKY5-003', name: 'Veerwati', role: 'Housekeeping', shift: '10:00 AM – 07:00 PM' },
        { id: 'H2', staffId: 'SKY5-013', name: 'Bhawna', role: 'Housekeeping', shift: '08:30 AM – 05:00 PM' }],
};
const day = '2026-10-15';

describe('tv board', () => {
    test('times', () => {
        expect(labelToMinutes('08:03 AM')).toBe(483);
        expect(labelToMinutes('12:15 PM')).toBe(735);
        expect(labelToMinutes('12:05 AM')).toBe(5);
        expect(labelToMinutes('--')).toBeNull();
        expect(minutesToLabel(483)).toBe('08:03 AM');
        expect(minutesToLabel(1125)).toBe('06:45 PM');
        expect(formatSpan(585)).toBe('9h 45m');
    });

    test('people who left are not on the board', () => {
        expect(activeStaff(registry).map(s => s.name)).toEqual(['Larissa', 'Varun', 'Veerwati', 'Bhawna']);
    });

    test('phone check-in and tablet scan together: first IN and last OUT count; late by own shift', () => {
        const logs = [
            { staffName: 'Varun', dateISO: day, checkIn: '08:03 AM', checkOut: '--', source: 'staff-web' },
            { staffName: 'Veerwati', dateISO: day, checkIn: '10:05 AM', checkOut: '06:45 PM', source: 'staff-web' },
            { staffName: 'Bhawna', dateISO: day, checkIn: '09:10 AM', checkOut: '--', source: 'staff-web', deleted: true },
            { staffName: 'Varun', dateISO: '2026-10-14', checkIn: '06:00 AM', checkOut: '--' },   // another day
        ];
        const faceRows = [{ staffId: 'SKY5-004', staffName: 'Varun', dateISO: day, checkIn: '10:44 AM', checkOut: '01:30 PM', source: 'face-scan' }];
        const b = buildTvBoard({ staff: activeStaff(registry), logs, faceRows, todayISO: day, nowMin: 14 * 60 });
        const by = Object.fromEntries(b.rows.map(r => [r.name, r]));
        expect(by.Varun).toMatchObject({ in: 483, out: 810, late: true, status: 'Checked out', minutes: 327 });   // 08:03 phone, 13:30 tablet; shift 07:00
        expect(by.Veerwati).toMatchObject({ in: 605, out: 1125, late: false, status: 'Checked out' });   // 10:05 is within 10 min of 10:00
        expect(by.Bhawna.status).toBe('Not in yet');   // her only row was deleted
        expect(by.Larissa).toMatchObject({ status: 'Not in yet', in: null });
        expect(b.counts).toMatchObject({ staff: 4, present: 2, late: 1, onTime: 1, notIn: 2, out: 2 });
        expect(b.latest[0]).toMatchObject({ name: 'Veerwati', kind: 'out', min: 1125 });
    });

    test('still at work: hours so far; no shift time = never late; leave', () => {
        const logs = [
            { staffName: 'Larissa', dateISO: day, checkIn: '11:30 AM', checkOut: '--' },
            { staffName: 'Bhawna', dateISO: day, checkIn: '--', checkOut: '--', status: 'Half-Day Leave' },
        ];
        const b = buildTvBoard({ staff: activeStaff(registry), logs, todayISO: day, nowMin: 13 * 60 });
        const by = Object.fromEntries(b.rows.map(r => [r.name, r]));
        expect(by.Larissa).toMatchObject({ status: 'Present', late: false, minutes: 90, sofar: true });
        expect(by.Bhawna.status).toBe('On leave');
        expect(b.counts.leave).toBe(1);
    });

    test('a check-out before the check-in (a leftover) does not count as the last check-out', () => {
        const logs = [{ staffName: 'Varun', dateISO: day, checkIn: '09:00 AM', checkOut: '--' }];
        const faceRows = [{ staffId: 'SKY5-004', staffName: 'Varun', dateISO: day, checkIn: '--', checkOut: '07:30 AM', source: 'face-scan' }];
        const r = buildTvBoard({ staff: activeStaff(registry), logs, faceRows, todayISO: day, nowMin: 600 }).rows.find(x => x.name === 'Varun');
        expect(r).toMatchObject({ in: 540, out: null, status: 'Late' });
    });
});
