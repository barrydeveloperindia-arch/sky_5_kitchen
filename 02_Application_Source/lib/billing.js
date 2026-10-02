/**
 * HOTEL SKY 5 - CART & BILLING LOGIC
 * Pure functions shared by ShopView (guest ordering) and App (room charges).
 */

export const GST_RATE = 0.05;
export const CART_STORAGE_KEY = 'sky5_cart';

// Rooms carry `type` instead of `name`; normalise so cart, invoice and
// WhatsApp text always have a printable name.
export function resolveCartItem(id, menuItems, rooms) {
    const numId = parseInt(id, 10);
    const menuItem = menuItems.find(c => c.id === numId);
    if (menuItem) return menuItem;
    const room = rooms.find(r => r.id === numId);
    if (room) return { ...room, name: room.type, category: 'Stays' };
    return null;
}

// Parse a saved cart defensively: corrupt JSON or bad quantities must not crash the shop.
export function loadCart(raw) {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        const cart = {};
        for (const [id, qty] of Object.entries(parsed)) {
            if (Number.isInteger(qty) && qty > 0) cart[id] = qty;
        }
        return cart;
    } catch {
        return {};
    }
}

// Drop ids that no longer exist (item removed from menu or deactivated by admin).
export function pruneCart(cart, menuItems, rooms) {
    const pruned = {};
    for (const [id, qty] of Object.entries(cart)) {
        if (resolveCartItem(id, menuItems, rooms)) pruned[id] = qty;
    }
    return pruned;
}

export function computeBill(cart, menuItems, rooms) {
    const items = [];
    for (const [id, qty] of Object.entries(cart)) {
        const item = resolveCartItem(id, menuItems, rooms);
        if (item) items.push({ ...item, quantity: qty });
    }
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    // Food 5%; a room booked from the shop carries the room rate (same as the room folio)
    const staysSubtotal = items.filter(i => i.category === 'Stays').reduce((sum, i) => sum + i.price * i.quantity, 0);
    const foodSubtotal = subtotal - staysSubtotal;
    const gst = Math.round(foodSubtotal * GST_RATE) + Math.round(staysSubtotal * ROOM_GST_RATE);
    return { items, totalItems, subtotal, foodSubtotal, staysSubtotal, gst, grandTotal: subtotal + gst };
}

// "Room 5" / "room no. 12" -> 5 / 12; tables and free text -> null.
export function parseRoomNumber(tableStr) {
    const match = String(tableStr || '').match(/\broom\D*(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
}

// foodBill on a room is stored PRE-GST; GST is added once, on the room folio.
export function addFoodBillToRoom(rooms, roomId, amount) {
    return rooms.map(r => (r.id === roomId ? { ...r, foodBill: (r.foodBill || 0) + amount } : r));
}

// Rate the dashboard has always used for room rent. Confirm the current slab with the CA.
export const ROOM_GST_RATE = 0.12;

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };

// Accepts datetime-local ("2026-09-29T10:00") or "28-Apr-2026, 11:30 AM" / "28 Apr 2026, 11:30 AM".
// "2026-09-29T10:05" for <input type="datetime-local">, from any supported stay date
export function toDateTimeInput(value) {
    const d = parseStayDate(value);
    if (!d) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseStayDate(value) {
    if (!value) return null;
    const s = String(value).trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0));
    const dmy = /^(\d{1,2})[-\s]([A-Za-z]{3,4})[-\s](\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i.exec(s);
    if (dmy) {
        const month = MONTHS[dmy[2].toLowerCase()];
        if (month === undefined) return null;
        let hour = +(dmy[4] || 0);
        if (dmy[6]) hour = (hour % 12) + (/pm/i.test(dmy[6]) ? 12 : 0);
        return new Date(+dmy[3], month, +dmy[1], hour, +(dmy[5] || 0));
    }
    return null;
}

// Nights = calendar days between check-in and check-out dates; minimum 1.
// No check-out yet (guest still in the room) = nights so far, up to `now`.
export function countNights(checkIn, checkOut, now = new Date()) {
    const a = parseStayDate(checkIn);
    const b = parseStayDate(checkOut) || (a && !checkOut ? now : null);
    if (!a || !b) return 1;
    const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.max(1, Math.round((dayB - dayA) / 86400000));
}

// Single source of truth for a room folio: receipt, room card, guest modal and Finance all use this.
export function computeRoomBill({ price, foodBill, checkIn, checkOut, gstEnabled = true, advance = 0, now }) {
    const nights = countNights(checkIn, checkOut, now);
    const rate = Number(price) || 0;
    const roomTotal = rate * nights;
    const foodTotal = Number(foodBill) || 0;
    const subtotal = roomTotal + foodTotal;
    const roomGst = gstEnabled ? Math.round(roomTotal * ROOM_GST_RATE) : 0;
    const foodGst = gstEnabled ? Math.round(foodTotal * GST_RATE) : 0;
    const gst = roomGst + foodGst;
    const grandTotal = subtotal + gst;
    const paid = Number(advance) || 0;
    const balance = grandTotal - paid;
    // due = still to collect; refund = advance taken beyond the bill (to give back)
    return { nights, rate, roomTotal, foodTotal, subtotal, roomGst, foodGst, gst, grandTotal, advance: paid, balance, due: Math.max(0, balance), refund: Math.max(0, -balance) };
}

// Indian rupee format used everywhere: 123456 -> "₹1,23,456"
export function inr(n) {
    return `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
}

// Final bill at check-out: the stay ends NOW (actual departure), not on the planned check-out
// date, so an early departure is not over-charged and an overstay is not under-charged.
export function checkoutFolio(room, now = new Date()) {
    return roomFolio({ ...room, guest: { ...(room.guest || {}), checkOut: localISO(now) } }, now);
}
function localISO(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export { localISO as toLocalDateTime };

// Folio for a room as stored in state (guest may be absent).
export function roomFolio(room, now) {
    const g = room.guest || {};
    return computeRoomBill({
        price: room.price,
        foodBill: room.foodBill,
        checkIn: g.checkIn,
        checkOut: g.checkOut,
        gstEnabled: g.gstEnabled !== false,
        advance: g.advance,
        now,
    });
}
