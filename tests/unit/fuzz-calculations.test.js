import { describe, test, expect } from 'vitest';
import { computeBill, computeRoomBill, countNights, parseRoomNumber, GST_RATE, ROOM_GST_RATE } from '../../02_Application_Source/lib/billing';
import { computeStock, validateTransaction } from '../../02_Application_Source/lib/inventory';
import { inventoryItems, LOCATIONS } from '../../02_Application_Source/data/inventory';
import { combos } from '../../02_Application_Source/data/combos';
import { rooms } from '../../02_Application_Source/data/rooms';

// Deterministic pseudo-random (so a failure can be reproduced): mulberry32
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const RUNS = 2000;

describe('shop bill invariants (random carts)', () => {
    test(`${RUNS} carts: totals, GST and item count always consistent`, () => {
        const r = rng(101);
        for (let i = 0; i < RUNS; i++) {
            const cart = {};
            const n = int(r, 0, 8);
            for (let k = 0; k < n; k++) cart[pick(r, combos).id] = int(r, 1, 6);
            if (r() < 0.2) cart[pick(r, rooms).id] = int(r, 1, 3);
            const b = computeBill(cart, combos, rooms);
            const expectSub = b.items.reduce((s, it) => s + it.price * it.quantity, 0);
            expect(b.subtotal).toBe(expectSub);
            const stays = b.items.filter(it => it.category === 'Stays').reduce((s, it) => s + it.price * it.quantity, 0);
            expect(b.staysSubtotal).toBe(stays);
            expect(b.gst).toBe(Math.round((expectSub - stays) * GST_RATE) + Math.round(stays * ROOM_GST_RATE));
            expect(b.grandTotal).toBe(b.subtotal + b.gst);
            expect(b.totalItems).toBe(Object.values(cart).reduce((a, q) => a + q, 0));
            expect(Number.isInteger(b.grandTotal)).toBe(true);
            for (const it of b.items) expect(it.name, `item ${it.id}`).toBeTruthy();
        }
    });
});

describe('room folio invariants (random stays)', () => {
    test(`${RUNS} stays: nights, GST split, balance`, () => {
        const r = rng(202);
        for (let i = 0; i < RUNS; i++) {
            const inDay = new Date(2026, int(r, 0, 11), int(r, 1, 28), int(r, 0, 23), int(r, 0, 59));
            const stay = int(r, 0, 20);
            const outDay = new Date(inDay.getTime() + stay * 86400000 + int(r, -10, 10) * 3600000);
            const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            const price = pick(r, [1200, 1800, 2500, 3500]);
            const food = int(r, 0, 5000);
            const advance = int(r, 0, 20000);
            const gstEnabled = r() < 0.8;
            const b = computeRoomBill({ price, foodBill: food, checkIn: iso(inDay), checkOut: iso(outDay), gstEnabled, advance });
            expect(b.nights).toBeGreaterThanOrEqual(1);
            expect(b.nights).toBe(countNights(iso(inDay), iso(outDay)));
            expect(b.roomTotal).toBe(price * b.nights);
            expect(b.subtotal).toBe(b.roomTotal + food);
            expect(b.roomGst).toBe(gstEnabled ? Math.round(b.roomTotal * ROOM_GST_RATE) : 0);
            expect(b.foodGst).toBe(gstEnabled ? Math.round(food * GST_RATE) : 0);
            expect(b.gst).toBe(b.roomGst + b.foodGst);
            expect(b.grandTotal).toBe(b.subtotal + b.gst);
            expect(b.balance).toBe(b.grandTotal - advance);
            for (const v of [b.roomTotal, b.gst, b.grandTotal, b.balance]) expect(Number.isInteger(v)).toBe(true);
        }
    });

    test('nights never decrease when the check-out moves later', () => {
        const r = rng(303);
        for (let i = 0; i < 500; i++) {
            const base = new Date(2026, 8, int(r, 1, 28), 12, 0);
            const a = new Date(base.getTime() + int(r, 0, 10) * 86400000);
            const b = new Date(a.getTime() + int(r, 0, 10) * 86400000);
            const f = (d) => d.toISOString().slice(0, 16);
            expect(countNights(f(base), f(b))).toBeGreaterThanOrEqual(countNights(f(base), f(a)));
        }
    });

    test('"Room N" is always read as room N, tables never', () => {
        for (let n = 1; n <= 500; n++) {
            expect(parseRoomNumber(`Room ${n}`)).toBe(n);
            expect(parseRoomNumber(`room no. ${n}`)).toBe(n);
            expect(parseRoomNumber(`Table ${n}`)).toBeNull();
        }
    });
});

describe('inventory invariants (random valid entry sequences)', () => {
    test('stock never negative anywhere; total = sum of locations; MOVE keeps total', () => {
        const r = rng(404);
        for (let run = 0; run < 60; run++) {
            const tx = [];
            for (let k = 0; k < 120; k++) {
                const item = pick(r, inventoryItems);
                const rows = computeStock(inventoryItems, tx);
                const type = pick(r, ['IN', 'OUT', 'TRANSFER']);
                const location = pick(r, LOCATIONS);
                const toLocation = LOCATIONS.find(l => l !== location);
                const qty = item.unit === 'Ltr' ? Math.round(r() * 60) / 10 : int(r, 0, 40);
                const entry = { code: item.code, type, qty, location, toLocation, date: '2026-10-01', by: 'QA' };
                if (validateTransaction(entry, rows) === null) tx.push(entry);
            }
            const rows = computeStock(inventoryItems, tx);
            for (const row of rows) {
                const sum = LOCATIONS.reduce((a, l) => a + (row.atLocation[l] || 0), 0);
                expect(Math.abs(sum - row.current), row.code).toBeLessThan(1e-9);
                for (const l of LOCATIONS) expect(row.atLocation[l], `${row.code}@${l}`).toBeGreaterThanOrEqual(0);
                const ins = tx.filter(t => t.code === row.code && t.type === 'IN').reduce((a, t) => a + t.qty, 0);
                const outs = tx.filter(t => t.code === row.code && t.type === 'OUT').reduce((a, t) => a + t.qty, 0);
                expect(Math.abs(row.current - (row.openingTotal + ins - outs)), row.code).toBeLessThan(1e-9);
            }
        }
    });
});
