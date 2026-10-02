/**
 * HOTEL SKY 5 - staff registry helpers (pure).
 */

// Staff registry lists the OPS Center reads; anything missing or not a list becomes an empty list
const REGISTRY_LISTS = ['reception', 'kitchen', 'housekeeping', 'special', 'dailySchedule'];
export function normalizeRegistry(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const out = { ...r };
    for (const k of REGISTRY_LISTS) out[k] = Array.isArray(r[k]) ? r[k].filter(x => x && typeof x === 'object') : [];
    return out;
}
