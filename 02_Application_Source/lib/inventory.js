/**
 * HOTEL SKY 5 - INVENTORY LOGIC
 * Same rules as the Excel workbook: Current = Opening + IN - OUT; status from condition + Min. Level.
 * Stock is kept per location (Kitchen (Upar) / Basement Store). TRANSFER moves stock between
 * locations without changing the total.
 */
import { LEGACY_LOCATIONS } from '../data/inventory';
import { toCSV } from './csv';

export const ENTRY_TYPES = ['IN', 'OUT', 'TRANSFER'];

// Entries saved before 29-09-2026 used the old list names
export const normalizeLocation = (loc) => LEGACY_LOCATIONS[loc] || loc;

export const INVENTORY_STORAGE_KEY = 'sky5_inventory_v1';

// Min. Level set by the owner for every item (29-09-2026); override per item in the app or Excel.
export const DEFAULT_MIN_LEVEL = 1;

export const openingTotal = (item) => Object.values(item.opening || {}).reduce((s, q) => s + (Number(q) || 0), 0);

// Floating-point safe for litre values like 4.5
const round = (n) => Math.round(n * 1000) / 1000;

export function stockStatus({ current, min, condition }) {
    if (condition === 'EXPIRED') return 'EXPIRED';
    if (condition === 'EMPTY') return 'REFILL';
    // below zero = more was issued than the register shows (two phones at once, or a deleted IN): recount
    if (current < 0) return 'CHECK COUNT';
    if (current <= 0) return 'OUT OF STOCK';
    if (min === undefined || min === null || min === '') return 'SET MIN';
    return current <= Number(min) ? 'REORDER' : 'OK';
}

export function computeStock(items, transactions = [], minLevels = {}, conditions = {}) {
    return items.map(item => {
        let stockIn = 0;
        let stockOut = 0;
        const atLocation = { ...item.opening };
        const add = (loc, q) => { atLocation[loc] = (atLocation[loc] || 0) + q; };
        for (const t of transactions) {
            if (t.code !== item.code) continue;
            const q = Number(t.qty) || 0;
            const loc = normalizeLocation(t.location);
            if (t.type === 'IN') { stockIn += q; add(loc, q); }
            else if (t.type === 'OUT') { stockOut += q; add(loc, -q); }
            else if (t.type === 'TRANSFER') { add(loc, -q); add(normalizeLocation(t.toLocation), q); }
        }
        for (const loc of Object.keys(atLocation)) atLocation[loc] = round(atLocation[loc]);
        const opening = openingTotal(item);
        const current = round(opening + stockIn - stockOut);
        const min = minLevels[item.code] ?? DEFAULT_MIN_LEVEL;
        const condition = conditions[item.code] || item.condition || 'Good';
        return {
            ...item,
            openingTotal: round(opening),
            stockIn: round(stockIn),
            stockOut: round(stockOut),
            current,
            atLocation,
            min,
            condition,
            status: stockStatus({ current, min, condition }),
        };
    });
}

// Returns an error message, or null when the entry is valid.
export function validateTransaction(entry, stockRows) {
    if (!entry.code) return 'Select an item.';
    const row = stockRows.find(r => r.code === entry.code);
    if (!row) return 'Unknown item code.';
    if (!ENTRY_TYPES.includes(entry.type)) return 'Choose IN, OUT or TRANSFER.';
    const qty = Number(entry.qty);
    if (!Number.isFinite(qty) || qty <= 0) return 'Quantity must be more than 0.';
    if (!entry.location) return 'Choose the location.';
    if (entry.type === 'TRANSFER') {
        if (!entry.toLocation) return 'Choose where the stock is going.';
        if (entry.toLocation === entry.location) return 'From and To must be different locations.';
    }
    const available = row.atLocation?.[entry.location] ?? 0;
    if ((entry.type === 'OUT' || entry.type === 'TRANSFER') && qty > available) return `Only ${available} ${row.unit} in ${entry.location}.`;
    if (!entry.date) return 'Date is required.';
    if (!String(entry.by || '').trim()) return 'Enter who made the entry.';
    return null;
}

export function emptyState() {
    return { transactions: [], minLevels: {}, conditions: {} };
}

export function loadInventoryState(raw) {
    if (!raw) return emptyState();
    try {
        const s = JSON.parse(raw);
        if (!s || typeof s !== 'object') return emptyState();
        return {
            transactions: Array.isArray(s.transactions) ? s.transactions.filter(t => t && t.code && ENTRY_TYPES.includes(t.type) && Number(t.qty) > 0) : [],
            minLevels: s.minLevels && typeof s.minLevels === 'object' ? s.minLevels : {},
            conditions: s.conditions && typeof s.conditions === 'object' ? s.conditions : {},
        };
    } catch {
        return emptyState();
    }
}

// CSV rules (formula-injection safe) live in one place for every export
export { toCSV };

export function stockCSV(stockRows, locations) {
    const header = ['Item Code', 'Item Name', 'Category', 'Unit', ...locations.map(l => `${l} (now)`), 'Opening', 'Stock IN', 'Stock OUT', 'Current Stock', 'Min. Level', 'Condition', 'Status'];
    const rows = stockRows.map(r => [r.code, r.name, r.category, r.unit, ...locations.map(l => r.atLocation?.[l] ?? 0), r.openingTotal, r.stockIn, r.stockOut, r.current, r.min, r.condition, r.status]);
    return toCSV([header, ...rows]);
}

export function registerCSV(transactions, stockRows) {
    const byCode = Object.fromEntries(stockRows.map(r => [r.code, r]));
    const header = ['Date', 'Item Code', 'Item Name', 'Unit', 'Type', 'Qty', 'Location', 'To Location', 'Supplier / Issued To', 'Entered By', 'Remarks'];
    const rows = transactions.map(t => [t.date, t.code, byCode[t.code]?.name || '', byCode[t.code]?.unit || '', t.type, t.qty, normalizeLocation(t.location), t.type === 'TRANSFER' ? normalizeLocation(t.toLocation) : '', t.party, t.by, t.remarks]);
    return toCSV([header, ...rows]);
}
