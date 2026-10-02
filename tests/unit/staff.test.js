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
