/**
 * HOTEL SKY 5 - staff PINs (the same PIN the staff use in TimeStation).
 * A PIN is never stored as it is, and the app can never read it back: only a hash of "staff ID + PIN" is saved
 * in hotel_staff_pins, which no device may read. To check a PIN the app asks the database to record a
 * "check" (hotel_pin_checks); the database rules allow that only when the hash matches. So a right PIN =
 * the write succeeds, a wrong PIN = "permission denied".
 */
import { collection, doc, setDoc } from 'firebase/firestore';
import { getServices, whenSignedIn } from './firebase';

export const PIN_RE = /^\d{4}$/;
export const PINS = 'hotel_staff_pins';
export const PIN_CHECKS = 'hotel_pin_checks';

// sha-256 hex of "sky5:<staff ID>:<PIN>"
export async function pinHash(staffId, pin) {
    const data = new TextEncoder().encode(`sky5:${staffId}:${pin}`);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const denied = (e) => e?.code === 'permission-denied' || /permission/i.test(e?.message || '');

// true = right PIN, false = wrong PIN; throws when there is no internet (the database must answer)
export async function verifyPin(staffId, pin) {
    if (!staffId || !PIN_RE.test(String(pin))) return false;
    await whenSignedIn();
    const { db } = getServices();
    const h = await pinHash(staffId, pin);
    try {
        await setDoc(doc(collection(db, PIN_CHECKS)), { staffId, h, at: new Date().toISOString() });
        return true;
    } catch (e) {
        if (denied(e)) return false;
        throw e;
    }
}

// First PIN for a person (only when none is saved yet), or a change (the old PIN must be right)
export async function savePin(staffId, pin, oldPin = null) {
    if (!staffId || !PIN_RE.test(String(pin))) throw new Error('The PIN must be 4 digits.');
    await whenSignedIn();
    const { db } = getServices();
    const rec = { h: await pinHash(staffId, pin), at: new Date().toISOString() };
    if (oldPin != null) rec.old = await pinHash(staffId, oldPin);
    try {
        await setDoc(doc(db, PINS, staffId), rec);
        return true;
    } catch (e) {
        if (denied(e)) return false;
        throw e;
    }
}
