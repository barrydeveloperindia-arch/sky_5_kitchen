import { describe, test, expect } from 'vitest';
import {
    dayKey, isoDate, staffNames, findTodayLog, findActiveLog, nextAction, waitRemainingMs, formatWait, distanceM, hotelCheck, formatDistance, HOTEL_LOCATION, tapUpdate, workedHours, formatHours, logIdFor, toLoc, mapLink, DUPLICATE_GUARD_MS,
} from '../../02_Application_Source/lib/staffAttendance';

const at = new Date(2026, 9, 13, 9, 5); // 13 Oct 2026, 09:05 local

describe('staff self check-in / check-out', () => {
    test('date keys match the register ("13-Oct") and keep the year beside it', () => {
        expect(dayKey(at)).toBe('13-Oct');
        expect(isoDate(at)).toBe('2026-10-13');
    });

    test('staff list: every registry name once, in register order, blanks skipped', () => {
        const reg = { reception: [{ name: 'Ganga', role: 'Front Desk' }], kitchen: [{ name: 'Varun' }, { name: ' ' }], housekeeping: [{ name: 'Varun' }, { name: 'Veervati' }] };
        expect(staffNames(reg).map(s => s.name)).toEqual(['Ganga', 'Varun', 'Veervati']);
        expect(staffNames(null)).toEqual([]);
    });

    test("today's row: same name + date; last year's 13-Oct and deleted rows do not count", () => {
        const logs = [
            { id: 1, staffName: 'Varun', date: '13-Oct', dateISO: '2025-10-13', checkIn: '09:00 AM' },
            { id: 2, staffName: 'Varun', date: '13-Oct', checkIn: '--', deleted: true },
            { id: 3, staffName: 'Ganga', date: '13-Oct', checkIn: '--' },
        ];
        expect(findTodayLog(logs, 'Varun', at)).toBeNull();
        expect(findTodayLog(logs, 'Ganga', at).id).toBe(3); // a manager-made row is reused, not duplicated
        expect(findTodayLog([...logs, { id: 4, staffName: 'Varun', date: '13-Oct', dateISO: '2026-10-13' }], 'Varun', at).id).toBe(4);
    });

    test('first tap = check-in, later taps = check-out, a tap inside 2 minutes is ignored', () => {
        const t = at.getTime();
        expect(nextAction(null, t)).toBe('in');
        expect(nextAction({ checkIn: '--' }, t)).toBe('in');
        const inLog = { checkIn: '09:05 AM', inAt: at.toISOString() };
        expect(nextAction(inLog, t + 60_000)).toBe('wait');
        expect(nextAction(inLog, t + DUPLICATE_GUARD_MS)).toBe('out');
        const outLog = { ...inLog, outAt: new Date(t + 8 * 3600_000).toISOString() };
        expect(nextAction(outLog, t + 8 * 3600_000 + 30_000)).toBe('wait');
        expect(nextAction(outLog, t + 9 * 3600_000)).toBe('out'); // rolling check-out: the last tap counts
        expect(nextAction({ checkIn: '09:00 AM' }, t)).toBe('out'); // manager typed the check-in (no timestamp)
    });

    test('tap fields: check-in sets Present + proof; check-out sets the time, hours and proof', () => {
        const loc = { lat: 30.69, lng: 76.85, acc: 12 };
        const inF = tapUpdate(null, 'in', { at, photoId: 'p1', loc });
        expect(inF).toMatchObject({ checkIn: '09:05 AM', inAt: at.toISOString(), inPhotoId: 'p1', inLoc: loc, status: 'Present', source: 'staff-web' });
        const later = new Date(at.getTime() + (8 * 60 + 30) * 60_000);
        const outF = tapUpdate({ ...inF }, 'out', { at: later, photoId: 'p2', loc: null });
        expect(outF).toMatchObject({ checkOut: '05:35 PM', outPhotoId: 'p2', outLoc: null, hours: 8.5 });
        expect(formatHours(workedHours({ inAt: '2026-10-13T11:17:00Z', outAt: '2026-10-13T11:19:10Z' }))).toBe('0h 02m'); // 2 min 10 s, not 3m
        expect(tapUpdate({ checkIn: '09:00 AM' }, 'out', { at: later }).hours).toBeUndefined(); // no check-in timestamp, no made-up hours
    });

    test('hours and labels', () => {
        expect(workedHours({ inAt: '2026-10-13T03:30:00Z', outAt: '2026-10-13T12:45:00Z' })).toBe(9.25);
        expect(workedHours({ inAt: '2026-10-13T03:30:00Z' })).toBeNull();
        expect(workedHours({ inAt: '2026-10-13T05:00:00Z', outAt: '2026-10-13T04:00:00Z' })).toBeNull();
        expect(formatHours(9.25)).toBe('9h 15m');
        expect(formatHours(null)).toBe('--');
        expect(formatHours(8.999)).toBe('9h 00m'); // never "8h 60m"
        expect(formatHours(0.01)).toBe('0h 01m');
        expect(formatHours(NaN)).toBe('--');
    });

    test('one record id per person per day, safe characters only', () => {
        expect(logIdFor('Mohammad Hafeez', '2026-10-13')).toBe('self-2026-10-13-mohammad-hafeez');
        expect(logIdFor('  A/B ', '2026-10-13')).toBe('self-2026-10-13-a-b');
    });

    test('location rounded, bad readings dropped, map link', () => {
        expect(toLoc({ coords: { latitude: 30.6942123, longitude: 76.8606789, accuracy: 14.6 } })).toEqual({ lat: 30.69421, lng: 76.86068, acc: 15 });
        expect(toLoc({ coords: { latitude: NaN, longitude: 1 } })).toBeNull();
        expect(toLoc(null)).toBeNull();
        expect(mapLink({ lat: 1, lng: 2 })).toBe('https://www.google.com/maps?q=1,2');
    });
});

describe('night shift (check-in last night, check-out this morning)', () => {
    const inAt = new Date(2026, 9, 12, 19, 0); // 12 Oct 19:00
    const night = { id: 'n1', staffName: 'Ratnesh', date: '12-Oct', dateISO: '2026-10-12', checkIn: '07:00 PM', inAt: inAt.toISOString(), checkOut: '--' };

    test("next morning's tap closes last night's row", () => {
        const morning = new Date(2026, 9, 13, 8, 30);
        expect(findActiveLog([night], 'Ratnesh', morning)?.id).toBe('n1');
        expect(nextAction(findActiveLog([night], 'Ratnesh', morning), morning.getTime())).toBe('out');
    });

    test('after the morning check-out, later taps still move that check-out (rolling)', () => {
        const out = { ...night, checkOut: '08:30 AM', outAt: new Date(2026, 9, 13, 8, 30).toISOString() };
        expect(findActiveLog([out], 'Ratnesh', new Date(2026, 9, 13, 8, 45))?.id).toBe('n1');
    });

    test('a new day starts fresh: checked out before midnight, older than 16 h, or a day row already exists', () => {
        const wentHome = { ...night, checkOut: '11:30 PM', outAt: new Date(2026, 9, 12, 23, 30).toISOString() };
        expect(findActiveLog([wentHome], 'Ratnesh', new Date(2026, 9, 13, 8, 30))).toBeNull();
        expect(findActiveLog([night], 'Ratnesh', new Date(2026, 9, 13, 11, 1))).toBeNull(); // 16 h 01 m later
        const today = { id: 't1', staffName: 'Ratnesh', date: '13-Oct', dateISO: '2026-10-13', checkIn: '--' };
        expect(findActiveLog([night, today], 'Ratnesh', new Date(2026, 9, 13, 8, 30)).id).toBe('t1');
        expect(findActiveLog([{ ...night, inAt: undefined }], 'Ratnesh', new Date(2026, 9, 13, 8, 30))).toBeNull(); // typed by hand, no timestamp
    });

    test('day staff: yesterday morning check-in does not carry over to today', () => {
        const day = { ...night, staffName: 'Varun', checkIn: '07:00 AM', inAt: new Date(2026, 9, 12, 7, 0).toISOString() };
        expect(findActiveLog([day], 'Varun', new Date(2026, 9, 13, 7, 0))).toBeNull();
    });
});

describe('2-minute guard countdown', () => {
    test('counts down from 2:00 and reaches 0 exactly when CHECK OUT switches on', () => {
        const t = Date.parse('2026-10-13T11:15:47Z');
        const log = { checkIn: '04:45 PM', inAt: new Date(t).toISOString() };
        expect(formatWait(waitRemainingMs(log, t))).toBe('2:00');
        expect(formatWait(waitRemainingMs(log, t + 28_500))).toBe('1:32');
        expect(waitRemainingMs(log, t + 120_000)).toBe(0);
        expect(nextAction(log, t + 119_999)).toBe('wait');
        expect(nextAction(log, t + 120_000)).toBe('out');
        expect(waitRemainingMs(null, t)).toBe(0);
        expect(waitRemainingMs({ checkIn: '09:00 AM' }, t)).toBe(0); // typed by the manager: no guard
    });
});

describe('hotel location check (Hotel Sky 5 map pin)', () => {
    test('distance in metres from the hotel pin', () => {
        expect(distanceM(HOTEL_LOCATION)).toBe(0);
        expect(distanceM({ lat: 30.72135, lng: 76.85260 })).toBeLessThan(15);
        const far = distanceM({ lat: 30.69421, lng: 76.86068 });
        expect(far).toBeGreaterThan(3000); expect(far).toBeLessThan(3600);
        expect(distanceM(null)).toBeNull();
        expect(distanceM({ lat: NaN, lng: 1 })).toBeNull();
    });
    test('inside 200 m (plus the phone GPS error, up to 100 m) = at hotel; otherwise flagged; no GPS = unknown', () => {
        expect(hotelCheck({ lat: 30.72135, lng: 76.85260, acc: 15 }).at).toBe(true);
        expect(hotelCheck({ lat: 30.7235, lng: 76.8525, acc: 10 }).at).toBe(false);      // about 245 m
        expect(hotelCheck({ lat: 30.7235, lng: 76.8525, acc: 60 }).at).toBe(true);       // same spot, poor GPS
        expect(hotelCheck({ lat: 30.7300, lng: 76.8525, acc: 500 }).at).toBe(false);     // error allowance is capped at 100 m
        expect(hotelCheck(null)).toEqual({ at: null, m: null });
    });
    test('tap fields keep the result so the register can show it', () => {
        const t = tapUpdate(null, 'in', { at: new Date(2026, 9, 14, 9, 0), loc: { lat: 30.69421, lng: 76.86068, acc: 15 } });
        expect(t.inAtHotel).toBe(false); expect(t.inDistM).toBeGreaterThan(3000);
        expect(formatDistance(45)).toBe('45 m'); expect(formatDistance(3420)).toBe('3.4 km'); expect(formatDistance(null)).toBe('');
    });
});

describe('a corrected name keeps today\'s row (found by staff ID)', () => {
    test('findTodayLog / findActiveLog with { name, staffId }', async () => {
        const { findTodayLog, findActiveLog, dayKey, isoDate } = await import('../../02_Application_Source/lib/staffAttendance');
        const at = new Date(2026, 9, 16, 12, 0);
        const row = { staffName: 'Varun', staffId: 'SKY5-004', date: dayKey(at), dateISO: isoDate(at), checkIn: '09:00 AM', inAt: new Date(2026, 9, 16, 9).toISOString() };
        expect(findTodayLog([row], 'Varun Kumar', at)).toBeNull();                                  // by name only: lost
        expect(findTodayLog([row], { name: 'Varun Kumar', staffId: 'SKY5-004' }, at)).toBe(row);     // by staff ID: found
        expect(findActiveLog([row], { name: 'Varun Kumar', staffId: 'SKY5-004' }, at)).toBe(row);
        expect(findTodayLog([row], { name: 'Someone', staffId: 'SKY5-009' }, at)).toBeNull();
        expect(findTodayLog([row], 'Varun', at)).toBe(row);                                         // old callers still work
    });
});
