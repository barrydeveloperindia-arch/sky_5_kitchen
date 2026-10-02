/**
 * HOTEL SKY 5 - CSV for Excel, shared by every export (stock, register, attendance).
 */

// Text that starts with = + - @ (or tab / CR) is run as a FORMULA when the CSV is opened in Excel
// ("CSV injection"). Staff-typed text is prefixed with ' so it always shows as plain text.
// Real numbers (e.g. stock -3) are left as numbers.
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(v) {
    if (v === undefined || v === null) return '';
    let s = String(v);
    if (typeof v !== 'number' && FORMULA_START.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCSV = (rows) => rows.map(r => r.map(csvCell).join(',')).join('\r\n');

// UTF-8 byte-order mark so Excel shows ₹ and Hindi text correctly
export const CSV_BOM = '\uFEFF';
