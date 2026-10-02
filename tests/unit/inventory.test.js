import { describe, test, expect } from 'vitest';
import {
    computeStock, stockStatus, validateTransaction, loadInventoryState, stockCSV, registerCSV, openingTotal,
} from '../../02_Application_Source/lib/inventory';
import { inventoryItems, LOCATIONS, COUNT_DATES, registerLists } from '../../02_Application_Source/data/inventory';

const KITCHEN = 'Kitchen (Upar)';
const BASEMENT = 'Basement Store';

const soap = inventoryItems.find(i => i.name === 'Hotel Soap');

describe('inventory data (generated from the Excel Item Master)', () => {
    test('70 unique item codes in SKY-XX-NNN format', () => {
        expect(inventoryItems).toHaveLength(70);
        const codes = inventoryItems.map(i => i.code);
        expect(new Set(codes).size).toBe(70);
        for (const c of codes) expect(c).toMatch(/^SKY-[A-Z]{2}-\d{3}$/);
    });

    test('no duplicate item+unit rows', () => {
        const keys = inventoryItems.map(i => `${i.name}|${i.unit}`);
        expect(new Set(keys).size).toBe(keys.length);
    });

    test('opening stock matches the handwritten registers (spot checks)', () => {
        expect(soap.opening).toEqual({ [KITCHEN]: 70, [BASEMENT]: 50 });
        expect(inventoryItems.find(i => i.name === 'Thali').opening).toEqual({ [KITCHEN]: 12, [BASEMENT]: 0 });
        expect(openingTotal(inventoryItems.find(i => i.name === 'Phenyl'))).toBe(4.5);
        expect(openingTotal(inventoryItems.find(i => i.name === 'Quarter Plate'))).toBe(17);
        expect(openingTotal(inventoryItems.find(i => i.name === 'Water Bottle (250 ml)'))).toBe(83);
    });

    test('two locations: Kitchen (Upar) counted 23-09, Basement Store counted 29-09', () => {
        expect(LOCATIONS).toEqual([KITCHEN, BASEMENT]);
        expect(COUNT_DATES).toEqual({ [KITCHEN]: '23-09-2026', [BASEMENT]: '29-09-2026' });
    });

    test('register lists keep every line in Sr. No. order: kitchen 18 + 20, basement 41', () => {
        expect(registerLists.map(l => [l.location, l.lines.length])).toEqual([[KITCHEN, 18], [KITCHEN, 20], [BASEMENT, 41]]);
        for (const l of registerLists) expect(l.lines.map(x => x.sr)).toEqual(l.lines.map((_, i) => i + 1));
        expect(registerLists[0].lines[0]).toMatchObject({ sr: 1, qty: 4, asWritten: 'Nepkin' });
        expect(registerLists[2].lines[40]).toMatchObject({ sr: 41, qty: 2 }); // Bharat Gas Cylinder (Empty)
    });

    test('opening per location = sum of that location register lines', () => {
        for (const item of inventoryItems) {
            for (const loc of LOCATIONS) {
                const sum = registerLists.filter(l => l.location === loc).flatMap(l => l.lines).filter(x => x.code === item.code).reduce((a, x) => a + x.qty, 0);
                expect(item.opening[loc], `${item.code} @ ${loc}`).toBeCloseTo(sum, 6);
            }
        }
    });
});

describe('stockStatus', () => {
    test.each([
        [{ current: 10, min: '', condition: 'Good' }, 'SET MIN'],
        [{ current: 10, min: 10, condition: 'Good' }, 'REORDER'],
        [{ current: 11, min: 10, condition: 'Good' }, 'OK'],
        [{ current: 0, min: 5, condition: 'Good' }, 'OUT OF STOCK'],
        [{ current: 83, min: 5, condition: 'EXPIRED' }, 'EXPIRED'],
        [{ current: 2, min: '', condition: 'EMPTY' }, 'REFILL'],
    ])('%o -> %s', (input, expected) => expect(stockStatus(input)).toBe(expected));
});

describe('computeStock', () => {
    test('current = opening + IN - OUT, only for the matching code', () => {
        const tx = [
            { code: soap.code, type: 'OUT', qty: 25 },
            { code: soap.code, type: 'IN', qty: 5 },
            { code: 'SKY-XX-999', type: 'IN', qty: 1000 },
        ];
        const row = computeStock(inventoryItems, tx).find(r => r.code === soap.code);
        expect(row.openingTotal).toBe(120);
        expect(row.stockIn).toBe(5);
        expect(row.stockOut).toBe(25);
        expect(row.current).toBe(100);
        expect(row.min).toBe(1); // owner's default Min. Level
        expect(row.status).toBe('OK');
    });

    test('min level and condition overrides drive status', () => {
        const rows = computeStock(inventoryItems, [], { [soap.code]: 150 }, {});
        expect(rows.find(r => r.code === soap.code).status).toBe('REORDER');
        const water = rows.find(r => r.name === 'Water Bottle (250 ml)');
        expect(water.status).toBe('EXPIRED');
        const cleared = computeStock(inventoryItems, [], {}, { [water.code]: 'Good' }).find(r => r.code === water.code);
        expect(cleared.status).toBe('OK');
    });

    test('decimal litres do not drift (4.5 - 0.3 = 4.2)', () => {
        const phenyl = inventoryItems.find(i => i.name === 'Phenyl');
        const row = computeStock(inventoryItems, [{ code: phenyl.code, type: 'OUT', qty: 0.3 }]).find(r => r.code === phenyl.code);
        expect(row.current).toBe(4.2);
    });
});

test('default Min. Level 1: stock of 1 is REORDER, explicit override wins', () => {
    const rows = computeStock(inventoryItems);
    expect(rows.every(r => r.min === 1)).toBe(true);
    const towel = rows.find(r => r.name === 'Duster Towel'); // 1 Pcs counted
    expect(towel.status).toBe('REORDER');
    expect(computeStock(inventoryItems, [], { [towel.code]: 0 }).find(r => r.code === towel.code).status).toBe('OK');
});

describe('validateTransaction', () => {
    const rows = computeStock(inventoryItems);
    const base = { code: soap.code, type: 'OUT', qty: 10, date: '2026-09-30', by: 'Bhawna', location: BASEMENT };
    test('valid entry', () => expect(validateTransaction(base, rows)).toBeNull());
    test('cannot issue more than is at that location', () => {
        expect(validateTransaction({ ...base, qty: 51 }, rows)).toBe('Only 50 Pcs in Basement Store.');
        expect(validateTransaction({ ...base, qty: 70, location: KITCHEN }, rows)).toBeNull();
        expect(validateTransaction({ ...base, qty: 71, location: KITCHEN }, rows)).toBe('Only 70 Pcs in Kitchen (Upar).');
    });
    test('transfer needs a different destination and enough stock at the source', () => {
        const t = { ...base, type: 'TRANSFER', qty: 20, toLocation: KITCHEN };
        expect(validateTransaction(t, rows)).toBeNull();
        expect(validateTransaction({ ...t, toLocation: '' }, rows)).toMatch(/where the stock is going/);
        expect(validateTransaction({ ...t, toLocation: BASEMENT }, rows)).toMatch(/must be different/);
        expect(validateTransaction({ ...t, qty: 60 }, rows)).toBe('Only 50 Pcs in Basement Store.');
    });
    test('zero / negative / text qty rejected', () => {
        for (const qty of [0, -1, 'abc', '']) expect(validateTransaction({ ...base, qty }, rows)).toMatch(/more than 0/);
    });
    test('item, type, date and name required', () => {
        expect(validateTransaction({ ...base, code: '' }, rows)).toMatch(/Select an item/);
        expect(validateTransaction({ ...base, type: 'X' }, rows)).toMatch(/IN, OUT or TRANSFER/);
        expect(validateTransaction({ ...base, location: '' }, rows)).toMatch(/location/);
        expect(validateTransaction({ ...base, date: '' }, rows)).toMatch(/Date/);
        expect(validateTransaction({ ...base, by: '  ' }, rows)).toMatch(/who made/);
    });
});

describe('loadInventoryState', () => {
    test('corrupt or missing storage gives empty state', () => {
        for (const raw of [null, '', '{bad', 'null', '[]']) {
            expect(loadInventoryState(raw).transactions).toEqual([]);
        }
    });
    test('drops malformed transactions', () => {
        const s = loadInventoryState(JSON.stringify({ transactions: [{ code: 'A', type: 'IN', qty: 2 }, { code: 'A', type: 'X', qty: 2 }, { type: 'IN', qty: 1 }, { code: 'A', type: 'OUT', qty: -3 }], minLevels: { A: 5 } }));
        expect(s.transactions).toHaveLength(1);
        expect(s.minLevels).toEqual({ A: 5 });
    });
});

describe('CSV export (opens in Excel)', () => {
    test('stock CSV has header + 70 rows and quotes commas', () => {
        const csv = stockCSV(computeStock(inventoryItems), LOCATIONS);
        const lines = csv.split('\r\n');
        expect(lines).toHaveLength(71);
        expect(lines[0]).toContain('Current Stock');
        expect(lines[0]).toContain('Kitchen (Upar) (now),Basement Store (now)');
        expect(csv).toContain(`${soap.code},Hotel Soap,Guest Amenities,Pcs,70,50,120`);
    });
    test('register CSV escapes quotes and commas in remarks', () => {
        const rows = computeStock(inventoryItems);
        const csv = registerCSV([{ date: '2026-09-30', code: soap.code, type: 'OUT', qty: 5, location: 'Basement Store', party: 'Room 5, 7', by: 'X', remarks: 'said "urgent"' }], rows);
        expect(csv).toContain('"Room 5, 7"');
        expect(csv).toContain('"said ""urgent"""');
        expect(csv).toContain('Hotel Soap');
    });
});

describe('per-location stock', () => {
    test('IN / OUT change only their location; TRANSFER moves stock, total unchanged', () => {
        const tx = [
            { code: soap.code, type: 'OUT', qty: 10, location: KITCHEN },
            { code: soap.code, type: 'IN', qty: 24, location: BASEMENT },
            { code: soap.code, type: 'TRANSFER', qty: 30, location: BASEMENT, toLocation: KITCHEN },
        ];
        const r = computeStock(inventoryItems, tx).find(x => x.code === soap.code);
        expect(r.atLocation).toEqual({ [KITCHEN]: 90, [BASEMENT]: 44 });
        expect(r.current).toBe(134);
        expect(r.stockIn).toBe(24);
        expect(r.stockOut).toBe(10);
    });

    test('entries saved with the old list names count for the kitchen', () => {
        const tx = [
            { code: soap.code, type: 'OUT', qty: 5, location: 'Inventory Stock' },
            { code: soap.code, type: 'OUT', qty: 2, location: 'Crockery & Serveware' },
        ];
        const r = computeStock(inventoryItems, tx).find(x => x.code === soap.code);
        expect(r.atLocation[KITCHEN]).toBe(63);
        expect(r.atLocation['Inventory Stock']).toBeUndefined();
    });
});

test('stock below zero (two phones issuing at once / deleted IN) is flagged CHECK COUNT, not OUT OF STOCK', () => {
    expect(stockStatus({ current: -3, min: 1, condition: 'Good' })).toBe('CHECK COUNT');
    expect(stockStatus({ current: 0, min: 1, condition: 'Good' })).toBe('OUT OF STOCK');
    expect(stockStatus({ current: -3, min: 1, condition: 'EXPIRED' })).toBe('EXPIRED');
});
