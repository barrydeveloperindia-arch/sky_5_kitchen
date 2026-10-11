import { test, expect } from 'vitest';
import { normalizeRegistry } from '../../02_Application_Source/lib/staff';

test('a registry with missing / broken lists never crashes the OPS Center', () => {
    for (const raw of [undefined, null, 'x', {}, { reception: null, kitchen: 'Arjun', special: [null, { name: 'MD Sir' }] }]) {
        const r = normalizeRegistry(raw);
        for (const k of ['reception', 'kitchen', 'housekeeping', 'special', 'dailySchedule']) expect(Array.isArray(r[k]), `${k} of ${JSON.stringify(raw)}`).toBe(true);
    }
    expect(normalizeRegistry({ special: [null, { name: 'MD Sir' }] }).special).toEqual([{ name: 'MD Sir' }]);
    const full = { reception: [{ name: 'A' }], kitchen: [], housekeeping: [], special: [], dailySchedule: [{ event: 'Lunch', time: '1 PM' }], extra: 1 };
    expect(normalizeRegistry(full)).toEqual(full);
});

import { parseShift, shiftSegments, onShiftAt } from '../../02_Application_Source/lib/staff';

test('shift text is read as real times (no hard-coded bars)', () => {
    expect(parseShift('08:30 AM – 06:30 PM')).toEqual({ start: 510, end: 1110, overnight: false });
    expect(parseShift('07:00 PM – 08:30 AM')).toEqual({ start: 1140, end: 510, overnight: true });
    expect(parseShift('12:00 PM - 12:00 AM')).toEqual({ start: 720, end: 0, overnight: true });
    expect(parseShift('Task-based (Flexible)')).toBeNull();
    expect(parseShift('08:15 AM – 08:30 AM | 11:00 AM – 11:15 AM')).toBeNull();
    expect(parseShift('')).toBeNull();
    const [a] = shiftSegments('06:00 AM – 06:00 PM');
    expect(a.left).toBeCloseTo(25);
    expect(a.width).toBeCloseTo(50);
    const night = shiftSegments('07:00 PM – 08:30 AM');
    expect(night).toHaveLength(2);
    expect(night[0].left + night[0].width).toBeCloseTo(100);
    expect(night[1].left).toBe(0);
    expect(shiftSegments('Task-based')).toEqual([]);
    expect(onShiftAt('07:00 PM – 08:30 AM', 23 * 60)).toBe(true);
    expect(onShiftAt('07:00 PM – 08:30 AM', 12 * 60)).toBe(false);
    expect(onShiftAt('08:30 AM – 06:30 PM', 12 * 60)).toBe(true);
});
