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

// "08:30 AM – 06:30 PM" -> minutes since midnight [510, 1110]; null when the text has no clear start/end time
const TIME = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
export function parseShift(shift) {
    const times = [...String(shift || '').matchAll(TIME)].map(m => {
        const h = Number(m[1]) % 12 + (/pm/i.test(m[3]) ? 12 : 0);
        return h * 60 + Number(m[2] || 0);
    });
    if (times.length !== 2) return null; // none, or several blocks ("08:15–08:30 | 11:00–11:15") -> not a single shift
    const [start, end] = times;
    if (start === end) return null;
    return { start, end, overnight: end < start };
}

// Bars on a 24-hour day as {left%, width%}; an overnight shift becomes two bars (till midnight + from midnight)
export function shiftSegments(shift) {
    const s = parseShift(shift);
    if (!s) return [];
    const pct = (m) => (m / 1440) * 100;
    if (!s.overnight) return [{ left: pct(s.start), width: pct(s.end - s.start) }];
    return [{ left: pct(s.start), width: pct(1440 - s.start) }, { left: 0, width: pct(s.end) }].filter(x => x.width > 0);
}

// Is the person on shift at this minute of the day?
export function onShiftAt(shift, minute) {
    const s = parseShift(shift);
    if (!s) return false;
    return s.overnight ? (minute >= s.start || minute < s.end) : (minute >= s.start && minute < s.end);
}
