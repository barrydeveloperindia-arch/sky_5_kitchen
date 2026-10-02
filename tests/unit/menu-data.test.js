import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { combos } from '../../02_Application_Source/data/combos';
import { rooms } from '../../02_Application_Source/data/rooms';
import { ambiance } from '../../02_Application_Source/data/ambiance';

// vite.config.js serves static files from 04_Digital_Assets (publicDir)
const PUBLIC_DIR = path.join(process.cwd(), '04_Digital_Assets');
const publicFileExists = (url) => fs.existsSync(path.join(PUBLIC_DIR, url.replace(/^\//, '')));

const KNOWN_CATEGORIES = ['Breakfast', 'Snacks', 'Salad', 'Chinese', 'Main Course', 'Rice', 'Breads', 'Thalis', 'Sweet Dish', 'Beverages'];

describe('Menu data (combos.js)', () => {
    test('ids are unique', () => {
        const ids = combos.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test('names are unique (case-insensitive) — no duplicate items on the card', () => {
        const names = combos.map(c => c.name.trim().toLowerCase());
        const dups = names.filter((n, i) => names.indexOf(n) !== i);
        expect(dups).toEqual([]);
    });

    test('every price is a positive whole rupee amount', () => {
        const bad = combos.filter(c => !Number.isInteger(c.price) || c.price <= 0);
        expect(bad.map(c => c.name)).toEqual([]);
    });

    test('every item has exactly one veg/non-veg marker (FSSAI dot)', () => {
        const bad = combos.filter(c => {
            const veg = c.description.startsWith('🟢 ');
            const nonVeg = c.description.startsWith('🔴 ');
            return veg === nonVeg || (c.description.includes('🟢') && c.description.includes('🔴'));
        });
        expect(bad.map(c => c.name)).toEqual([]);
    });

    test('every category is one the menu card actually renders', () => {
        const unknown = combos.filter(c => !KNOWN_CATEGORIES.includes(c.category));
        expect(unknown.map(c => `${c.name}: ${c.category}`)).toEqual([]);
    });

    test('every item image exists in the served assets folder', () => {
        const missing = combos.filter(c => !publicFileExists(c.image));
        expect(missing.map(c => `${c.name} -> ${c.image}`)).toEqual([]);
    });

    test('non-veg items are not mislabelled as veg (chicken/egg keyword check)', () => {
        const bad = combos.filter(c => /chicken|egg|omelette|mutton|fish/i.test(c.name) && !c.description.startsWith('🔴'));
        expect(bad.map(c => c.name)).toEqual([]);
    });
});

describe('Room data (rooms.js)', () => {
    test('room ids are unique and never collide with menu ids (shared cart keys)', () => {
        const ids = rooms.map(r => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        const menuIds = new Set(combos.map(c => c.id));
        expect(ids.filter(id => menuIds.has(id))).toEqual([]);
    });

    test('every room has a type, positive price, valid status and existing image', () => {
        for (const r of rooms) {
            expect(r.type, `room ${r.id}`).toBeTruthy();
            expect(r.price, `room ${r.id}`).toBeGreaterThan(0);
            expect(['Clean', 'Dirty', 'Occupied', 'Maintenance'], `room ${r.id}`).toContain(r.status);
            expect(publicFileExists(r.image), `room ${r.id} image ${r.image}`).toBe(true);
        }
    });

    test('occupied rooms have guest details; free rooms do not', () => {
        for (const r of rooms) {
            if (r.status === 'Occupied') expect(r.guest?.name, `room ${r.id}`).toBeTruthy();
            else expect(r.guest, `room ${r.id}`).toBeUndefined();
        }
    });
});

describe('Ambiance data', () => {
    test('ids unique and images exist', () => {
        expect(new Set(ambiance.map(a => a.id)).size).toBe(ambiance.length);
        const missing = ambiance.filter(a => !publicFileExists(a.image));
        expect(missing.map(a => a.image)).toEqual([]);
    });
});

describe('live seed (what the real hotel data starts with)', () => {
    test('every room free, no sample guests, same 17 rooms and rates', async () => {
        const { liveSeedRooms } = await import('../../02_Application_Source/data/rooms');
        const live = liveSeedRooms();
        expect(live).toHaveLength(rooms.length);
        expect(live.every(r => r.status === 'Clean' && r.guest === undefined && r.foodBill === undefined)).toBe(true);
        expect(live.map(r => [r.id, r.price, r.type])).toEqual(rooms.map(r => [r.id, r.price, r.type]));
    });
});
