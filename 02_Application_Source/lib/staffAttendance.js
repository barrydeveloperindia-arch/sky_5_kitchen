/**
 * HOTEL SKY 5 - staff self check-in / check-out (share link: /attendance).
 * Each staff member opens the link on their own phone, picks their name and taps CHECK IN / CHECK OUT.
 * Every tap saves a selfie and the phone's location as proof. The record goes into the same
 * hotel_attendance collection the OPS Center register reads, so reports and exports work unchanged.
 * Rules (same as the AuraLock terminal): the first tap of the day is the check-in, later taps move the
 * check-out (the last one of the day counts), and a second tap within 2 minutes is ignored.
 */
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "06-May": the date key the attendance register already uses
export const dayKey = (d = new Date()) => `${String(d.getDate()).padStart(2, '0')}-${MONTH_ABBR[d.getMonth()]}`;
// "2026-10-13" (local date), kept beside the short key so reports know the year
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// "08:25 AM": same text the register's CHECK-IN / CHECK-OUT buttons write
export const timeLabel = (d = new Date()) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const has = (t) => !!t && t !== '--';

export const DUPLICATE_GUARD_MS = 2 * 60 * 1000;
export const STAFF_KEY = 'sky5_attendance_staff';

// Every staff name in the registry, each once, in register order (people marked Left are not offered)
export function staffNames(registry) {
    const seen = new Set();
    const out = [];
    for (const dept of ['reception', 'kitchen', 'housekeeping']) {
        for (const s of registry?.[dept] || []) {
            const name = String(s?.name || '').trim();
            if (name && !seen.has(name) && s.status !== 'Left') { seen.add(name); out.push({ name, dept, role: s.role || '', staffId: s.staffId || '', photoId: s.photoId || '' }); }
        }
    }
    return out;
}

// Today's row for this person (a row the manager already made counts too). The short "13-Oct" key has
// no year, so a row that carries its full date must match that too (last year's 13-Oct is not today).
export function findTodayLog(logs, name, at = new Date()) {
    const key = dayKey(at), iso = isoDate(at);
    return (logs || []).find(l => l && l.staffName === name && l.date === key && (!l.dateISO || l.dateISO === iso) && !l.deleted) || null;
}

// A shift is at most this long: a check-in from last night still takes this morning's check-out
export const MAX_SHIFT_MS = 16 * 60 * 60 * 1000;
const startOfDay = (at) => new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime();

// The row the next tap belongs to: today's row, or (night shift) yesterday's row while that shift is
// still running - checked in less than 16 h ago and not checked out before midnight.
export function findActiveLog(logs, name, at = new Date()) {
    const today = findTodayLog(logs, name, at);
    if (today) return today;
    const yesterday = findTodayLog(logs, name, new Date(startOfDay(at) - 12 * 3600000));
    if (!yesterday || !has(yesterday.checkIn)) return null;
    const inAt = Date.parse(yesterday.inAt || '');
    if (!Number.isFinite(inAt) || at.getTime() - inAt > MAX_SHIFT_MS) return null;
    const outAt = Date.parse(yesterday.outAt || '');
    if (Number.isFinite(outAt) && outAt < startOfDay(at)) return null; // already went home last night
    return yesterday;
}

// What the next tap does: 'in' (no check-in yet today), 'out' (moves the check-out), or 'wait' (2-minute guard)
export function nextAction(log, now = Date.now()) {
    if (!log || !has(log.checkIn)) return 'in';
    const last = Date.parse(log.outAt || log.inAt || '');
    if (Number.isFinite(last) && now - last < DUPLICATE_GUARD_MS) return 'wait';
    return 'out';
}

// How long until the 2-minute guard ends (0 = a tap works now)
export function waitRemainingMs(log, now = Date.now()) {
    if (!log || !has(log.checkIn)) return 0;
    const last = Date.parse(log.outAt || log.inAt || '');
    if (!Number.isFinite(last)) return 0;
    return Math.max(0, DUPLICATE_GUARD_MS - (now - last));
}
export const formatWait = (ms) => { const sec = Math.ceil(ms / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };

// Hours between check-in and check-out, from the saved timestamps (null if either is missing)
export function workedHours(log) {
    const a = Date.parse(log?.inAt || ''), b = Date.parse(log?.outAt || '');
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
    return Math.round(((b - a) / 3600000) * 10000) / 10000; // 4 decimals (0.36 s), so the shown minutes are exact
}

// 8.5 -> "8h 30m" (whole minutes, so it can never show "8h 60m")
export function formatHours(h) {
    if (h == null || !Number.isFinite(h)) return '--';
    const m = Math.round(h * 60);
    return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

// Stable record id for a self check-in: one row per person per day, even if two phones tap at once
export const logIdFor = (name, iso = isoDate()) => `self-${iso}-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

// Fields to write for this tap. `photoId` / `loc` are the proof saved with it.
export function tapUpdate(log, action, { at = new Date(), photoId = null, loc = null } = {}) {
    const iso = at.toISOString();
    if (action === 'in') {
        return { checkIn: timeLabel(at), inAt: iso, inPhotoId: photoId, inLoc: loc, status: 'Present', source: 'staff-web' };
    }
    const out = { checkOut: timeLabel(at), outAt: iso, outPhotoId: photoId, outLoc: loc };
    const h = workedHours({ ...log, outAt: iso });
    if (h != null) out.hours = h;
    return out;
}

// Location as saved: rounded to ~1 m, with the phone's accuracy in metres
export function toLoc(pos) {
    if (!pos?.coords) return null;
    const { latitude, longitude, accuracy } = pos.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { lat: Math.round(latitude * 1e5) / 1e5, lng: Math.round(longitude * 1e5) / 1e5, acc: Math.round(accuracy || 0) };
}

export const mapLink = (loc) => (loc ? `https://www.google.com/maps?q=${loc.lat},${loc.lng}` : null);

// Photo size limit (the database rule checks the same number)
export const MAX_PHOTO_CHARS = 150000;
