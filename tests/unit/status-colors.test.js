import { test, expect } from 'vitest';
import fs from 'fs';
import { STATUS_COLORS, ENTRY_COLORS, statusInk } from '../../02_Application_Source/lib/statusColors';
import { reportHTML } from '../../02_Application_Source/lib/inventoryReport';
import { computeStock } from '../../02_Application_Source/lib/inventory';
import { inventoryItems } from '../../02_Application_Source/data/inventory';

// Colour coding must mean the same thing on the screen, in the printed report and in the PDF.
const css = fs.readFileSync('02_Application_Source/components/inventory.css', 'utf8');
const vars = Object.fromEntries([...css.matchAll(/(--inv-[a-z-]+):\s*(#[0-9a-f]{3,6})/gi)].map(m => [m[1], m[2].toLowerCase()]));
const resolve = (v) => { const m = /var\((--inv-[a-z-]+)\)/.exec(v); const x = (m ? vars[m[1]] : v).toLowerCase(); return x === '#fff' ? '#ffffff' : x; };
const rule = (sel) => {
    const m = new RegExp(`${sel.replace(/\./g, '\\.')}[^{]*\\{([^}]*)\\}`).exec(css);
    if (!m) return null;
    const get = (p) => { const x = new RegExp(`(?:^|;|\\s)${p}:\\s*([^;]+)`).exec(m[1]); return x && resolve(x[1].trim()); };
    return { fg: get('color'), bg: get('background') };
};
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('app stock-status pills use exactly the shared colours', () => {
    for (const [s, c] of Object.entries(STATUS_COLORS)) {
        expect(rule(`.st-${s.replace(/ /g, '-')}`), s).toEqual(c);
    }
});
test('every status colour pair is readable (WCAG AA 4.5:1)', () => {
    for (const [s, c] of Object.entries(STATUS_COLORS)) expect(contrast(c.fg, c.bg), s).toBeGreaterThanOrEqual(4.5);
    for (const [t, col] of Object.entries(ENTRY_COLORS)) expect(contrast(col, '#ffffff'), t).toBeGreaterThanOrEqual(4.5);
});
test('one colour = one meaning: no two different statuses share a solid colour; MOVE is not CHECK COUNT purple', () => {
    const inks = Object.entries(STATUS_COLORS).map(([s]) => [s, statusInk(s)]);
    expect(statusInk('CHECK COUNT')).not.toBe(ENTRY_COLORS.TRANSFER);
    expect(resolve(rule('.inv-type.TRANSFER').fg)).toBe(ENTRY_COLORS.TRANSFER);
    expect(resolve(rule('.inv-type.OUT').fg)).toBe(ENTRY_COLORS.OUT);
    expect(resolve(rule('.inv-type.IN').fg)).toBe(ENTRY_COLORS.IN);
    expect(inks.find(([s]) => s === 'CHECK COUNT')[1]).toBe('#6b21a8');
});
test('printed report carries the same status colours', () => {
    const rows = computeStock(inventoryItems, []);
    const html = reportHTML(rows, [], { generatedAt: 'now', countDates: '' });
    for (const [s, c] of Object.entries(STATUS_COLORS)) expect(html, s).toContain(`.st-${s.replace(/ /g, '-')} { background: ${c.bg}; color: ${c.fg}; }`);
});
