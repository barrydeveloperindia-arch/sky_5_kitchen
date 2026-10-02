import { describe, test, expect } from 'vitest';
import { computeStock, validateTransaction, stockStatus, stockCSV, registerCSV } from '../../02_Application_Source/lib/inventory';
import { reportSummary, whatsappSummary, reportHTML } from '../../02_Application_Source/lib/inventoryReport';
import { csvCell, toCSV } from '../../02_Application_Source/lib/csv';
import { countNights, toDateTimeInput } from '../../02_Application_Source/lib/billing';
import { inventoryItems, LOCATIONS } from '../../02_Application_Source/data/inventory';

// Same reproducible RNG as fuzz-calculations (mulberry32)
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
const NASTY = ['Room 3, "VIP"', '=HYPERLINK("http://x","click")', '+91 98', '-5 pcs', '@cmd', 'line1\nline2', 'Bhawna', 'राम', ''];

// Minimal RFC-4180 parser (quotes, doubled quotes, commas and newlines inside quotes)
function parseCSV(text) {
    const rows = [[]];
    let cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (q) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
        } else if (c === '"') q = true;
        else if (c === ',') { rows.at(-1).push(cell); cell = ''; }
        else if (c === '\r' && text[i + 1] === '\n') { rows.at(-1).push(cell); cell = ''; rows.push([]); i++; }
        else cell += c;
    }
    rows.at(-1).push(cell);
    return rows;
}

function randomState(seed) {
    const r = rng(seed);
    const tx = [];
    for (let k = 0; k < 80; k++) {
        const item = pick(r, inventoryItems);
        const rows = computeStock(inventoryItems, tx);
        const type = pick(r, ['IN', 'OUT', 'TRANSFER']);
        const location = pick(r, LOCATIONS);
        const e = { code: item.code, type, qty: item.unit === 'Ltr' ? Math.round(r() * 50) / 10 : int(r, 1, 30), location, toLocation: LOCATIONS.find(l => l !== location), date: '2026-10-02', by: pick(r, NASTY) || 'QA', party: pick(r, NASTY), remarks: pick(r, NASTY) };
        if (validateTransaction(e, rows) === null) tx.push(e);
    }
    const minLevels = {}, conditions = {};
    for (const it of inventoryItems) {
        if (r() < 0.3) minLevels[it.code] = int(r, 0, 200);
        if (r() < 0.1) conditions[it.code] = pick(r, ['Good', 'Damaged', 'EXPIRED', 'EMPTY']);
    }
    return { tx, rows: computeStock(inventoryItems, tx, minLevels, conditions) };
}

describe('stock CSV / report / WhatsApp always agree with the stock calculation', () => {
    test('40 random registers: CSV columns = computed stock, statuses re-derive, totals add up', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const { tx, rows } = randomState(seed);
            const csv = parseCSV(stockCSV(rows, LOCATIONS));
            const [header, ...data] = csv;
            expect(data).toHaveLength(rows.length);
            const col = (name) => header.indexOf(name);
            data.forEach((d, i) => {
                const r = rows[i];
                expect(d[0]).toBe(r.code);
                const locSum = LOCATIONS.reduce((a, l) => a + Number(d[col(`${l} (now)`)]), 0);
                expect(Math.abs(locSum - Number(d[col('Current Stock')])), r.code).toBeLessThan(1e-9);
                expect(Number(d[col('Current Stock')])).toBe(r.current);
                expect(Math.abs(Number(d[col('Opening')]) + Number(d[col('Stock IN')]) - Number(d[col('Stock OUT')]) - r.current), r.code).toBeLessThan(1e-9);
                expect(d[col('Status')]).toBe(stockStatus({ current: r.current, min: r.min, condition: r.condition }));
            });
            // the register CSV keeps every entry, including commas / quotes / newlines typed by staff
            const reg = parseCSV(registerCSV(tx, rows));
            expect(reg).toHaveLength(tx.length + 1);
            reg.slice(1).forEach((d, i) => {
                const party = tx[i].party;
                expect(d[8].replace(/^'/, '')).toBe(party);
            });
            // summary counts partition all items
            const s = reportSummary(rows, tx);
            const setMin = rows.filter(r => r.status === 'SET MIN').length;
            expect(s.ok + s.reorder + s.expiredRefill + setMin).toBe(rows.length);
            expect(s.alerts.length).toBe(s.reorder + s.expiredRefill);
            // WhatsApp lists every alert and every item exactly once in the full stock part
            const wa = whatsappSummary(rows, tx, { generatedAt: 'now' });
            for (const a of s.alerts) expect(wa).toContain(`${a.name} - ${a.current} ${a.unit} - ${a.status}`);
            for (const r of rows) expect(wa.split(`\n${r.code} `).length - 1, r.code).toBe(1);
            expect(wa).not.toMatch(/NaN|undefined/);
            // printed report shows each item's current stock
            const html = reportHTML(rows, tx, { generatedAt: 'now', countDates: '' });
            expect(html).not.toMatch(/NaN|undefined/);
        }
    });
});

describe('CSV is safe to open in Excel', () => {
    test('typed text that looks like a formula is neutralised; real numbers stay numbers', () => {
        expect(csvCell('=HYPERLINK("http://x","click")')).toBe('"\'=HYPERLINK(""http://x"",""click"")"');
        expect(csvCell('+91 98')).toBe("'+91 98");
        expect(csvCell('-5 pcs')).toBe("'-5 pcs");
        expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
        expect(csvCell(-3)).toBe('-3');
        expect(csvCell(4.5)).toBe('4.5');
        expect(csvCell('Room 3, "VIP"')).toBe('"Room 3, ""VIP"""');
        expect(csvCell(null)).toBe('');
        expect(parseCSV(toCSV([['a\nb', 'c']]))).toEqual([['a\nb', 'c']]);
    });
    test('fuzz: any typed text round-trips through the CSV (only a leading quote is added to formulas)', () => {
        const r = rng(77);
        const chars = 'ab ,"\n\r=+-@\t₹राम1';
        for (let i = 0; i < 3000; i++) {
            const s = Array.from({ length: int(r, 0, 12) }, () => chars[int(r, 0, chars.length - 1)]).join('');
            const back = parseCSV(toCSV([[s, 'x']]))[0];
            expect(back[1]).toBe('x');
            const expected = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
            expect(back[0]).toBe(expected);
        }
    });
});

describe('stay dates in every accepted format give the same nights', () => {
    test('2000 random stays: "28-Apr-2026, 11:30 AM" style = ISO style', () => {
        const r = rng(909);
        const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const legacy = (d) => {
            const h = d.getHours() % 12 || 12;
            return `${String(d.getDate()).padStart(2, '0')}-${MON[d.getMonth()]}-${d.getFullYear()}, ${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
        };
        for (let i = 0; i < 2000; i++) {
            const a = new Date(2026, int(r, 0, 11), int(r, 1, 28), int(r, 0, 23), int(r, 0, 59));
            const b = new Date(a.getTime() + int(r, 0, 15) * 86400000 + int(r, -12, 12) * 3600000);
            expect(countNights(legacy(a), legacy(b)), `${legacy(a)} -> ${legacy(b)}`).toBe(countNights(toDateTimeInput(legacy(a)), toDateTimeInput(legacy(b))));
            expect(toDateTimeInput(legacy(a))).toBe(`${a.getFullYear()}-${String(a.getMonth() + 1).padStart(2, '0')}-${String(a.getDate()).padStart(2, '0')}T${String(a.getHours()).padStart(2, '0')}:${String(a.getMinutes()).padStart(2, '0')}`);
        }
    });
});
