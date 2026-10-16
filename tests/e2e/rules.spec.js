import { test, expect } from '@playwright/test';

// Security rules on the emulator, called the way a phone would (signed-in anonymous user).
test.skip(({ isMobile }) => isMobile, 'no browser needed');

const project = `demo-rules-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const user = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'qa', user_id: 'qa', aud: project, iss: `https://securetoken.google.com/${project}`, iat: 1, exp: 9999999999, firebase: { sign_in_provider: 'anonymous' } })}.`;
const base = `http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents`;
const v = (x) => (typeof x === 'number' ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x }) : typeof x === 'boolean' ? { booleanValue: x } : Array.isArray(x) ? { arrayValue: { values: x.map(v) } } : typeof x === 'string' ? { stringValue: x } : x === null ? { nullValue: null } : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } });
const put = (request, path, data, auth = user) => request.patch(`${base}/${path}`, {
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    data: { fields: Object.fromEntries(Object.entries(data).map(([k, x]) => [k, v(x)])) },
});

test('rooms: a normal room save is allowed', async ({ request }) => {
    expect((await put(request, 'hotel_rooms/2', { id: 2, status: 'Occupied', price: 1800, foodBill: 388, guest: { name: 'QA' } })).status()).toBe(200);
});
test('rooms: negative food bill, unknown status or missing price are refused', async ({ request }) => {
    expect((await put(request, 'hotel_rooms/3', { id: 3, status: 'Occupied', price: 1800, foodBill: -500 })).status()).toBe(403);
    expect((await put(request, 'hotel_rooms/4', { id: 4, status: 'Hacked', price: 1800 })).status()).toBe(403);
    expect((await put(request, 'hotel_rooms/5', { id: 5, status: 'Clean' })).status()).toBe(403);
    expect((await put(request, 'hotel_rooms/6', { id: 6, status: 'Clean', price: '1800' })).status()).toBe(403);
});
test('settlements: money must be non-negative numbers', async ({ request }) => {
    expect((await put(request, 'hotel_settlements/s1', { roomId: 2, total: 2016, collected: 2016, refund: 0 })).status()).toBe(200);
    expect((await put(request, 'hotel_settlements/s2', { roomId: 2, total: 2016, collected: -1 })).status()).toBe(403);
});
test('not signed in = no access; unknown collections and hard deletes are refused', async ({ request }) => {
    expect((await put(request, 'hotel_rooms/7', { id: 7, status: 'Clean', price: 1200 }, null)).status()).toBe(403);
    expect((await put(request, 'secrets/x', { a: 'b' })).status()).toBe(403);
    await put(request, 'hotel_rooms/8', { id: 8, status: 'Clean', price: 1200 });
    expect((await request.delete(`${base}/hotel_rooms/8`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
});
test('inventory: an entry cannot be edited, only soft-deleted', async ({ request }) => {
    const create = await request.post(`${base}/inventory_transactions?documentId=t1`, {
        headers: { Authorization: `Bearer ${user}` },
        data: { fields: { code: v('SKY-GA-002'), type: v('OUT'), qty: v(2), date: v('2026-10-01'), by: v('QA'), location: v('Basement Store') } },
    });
    expect(create.status()).toBe(200);
    expect((await request.patch(`${base}/inventory_transactions/t1?updateMask.fieldPaths=qty`, { headers: { Authorization: `Bearer ${user}` }, data: { fields: { qty: v(200) } } })).status()).toBe(403);
    expect((await request.patch(`${base}/inventory_transactions/t1?updateMask.fieldPaths=deleted`, { headers: { Authorization: `Bearer ${user}` }, data: { fields: { deleted: { booleanValue: true } } } })).status()).toBe(200);
});

test('attendance selfies: a JPEG under the size limit is saved once, never changed or deleted', async ({ request }) => {
    const photo = { logId: 'self-x', kind: 'in', staffName: 'QA', at: '2026-10-13T03:30:00Z', data: 'data:image/jpeg;base64,AAAA' };
    expect((await put(request, 'hotel_attendance_photos/p1', photo)).status()).toBe(200);
    expect((await put(request, 'hotel_attendance_photos/p1', { ...photo, staffName: 'Someone else' })).status()).toBe(403);
    expect((await request.delete(`${base}/hotel_attendance_photos/p1`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance_photos/p2', { ...photo, data: 'data:text/html;base64,AAAA' })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance_photos/p3', { ...photo, data: 'data:image/jpeg;base64,' + 'A'.repeat(150001) })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance_photos/p4', { ...photo, kind: 'x' })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance_photos/p5', photo, null)).status()).toBe(403);
});

test('staff photos: one JPEG per SKY5 staff ID, can be replaced, never deleted', async ({ request }) => {
    const photo = { staffId: 'SKY5-015', data: 'data:image/jpeg;base64,AAAA', at: '2026-10-13T12:00:00Z' };
    expect((await put(request, 'hotel_staff_photos/SKY5-015', photo)).status()).toBe(200);
    expect((await put(request, 'hotel_staff_photos/SKY5-015', { ...photo, data: 'data:image/jpeg;base64,BBBB' })).status()).toBe(200);
    expect((await request.delete(`${base}/hotel_staff_photos/SKY5-015`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_photos/SKY5-016', { ...photo, staffId: 'SKY5-999' })).status()).toBe(403); // id must match
    expect((await put(request, 'hotel_staff_photos/anything', { ...photo, staffId: 'anything' })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_photos/SKY5-017', { ...photo, staffId: 'SKY5-017', data: 'data:image/png;base64,AAAA' })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_photos/SKY5-018', { ...photo, staffId: 'SKY5-018', aadhaar: '1234' })).status()).toBe(403); // no extra fields
});

test('staff faces: 128 numbers from a staff photo or a first check-in, or an empty reset; never deleted', async ({ request }) => {
    const face = { staffName: 'QA', staffId: 'SKY5-020', descriptor: Array.from({ length: 128 }, () => 0.1), source: 'first-check-in', photoId: 'p1', at: '2026-10-14T10:00:00Z', reset: false };
    const reset = { ...face, descriptor: [], source: 'reset', photoId: '', reset: true };
    expect((await put(request, 'hotel_staff_faces/SKY5-020', face)).status()).toBe(200);
    expect((await put(request, 'hotel_staff_faces/SKY5-020', reset)).status()).toBe(200);
    expect((await put(request, 'hotel_staff_faces/SKY5-020', { ...face, source: 'staff-photo' })).status()).toBe(200);
    expect((await request.delete(`${base}/hotel_staff_faces/SKY5-020`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_faces/SKY5-021', { ...face, descriptor: [0.1] })).status()).toBe(403);   // not 128
    expect((await put(request, 'hotel_staff_faces/SKY5-022', { ...reset, reset: false })).status()).toBe(403);   // empty but not a reset
    expect((await put(request, 'hotel_staff_faces/SKY5-023', { ...face, source: 'hacker' })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_faces/SKY5-024', { ...face, aadhaar: '1234' })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_faces/SKY5-025', face, null)).status()).toBe(403);   // signed in only
});

test('attendance rows: need a staff name; hours must be a real number of hours; no garbage in the flags', async ({ request }) => {
    const row = { staffName: 'QA', date: '14 Oct', dateISO: '2026-10-14', checkIn: '09:00 AM', checkOut: '--', status: 'Present' };
    expect((await put(request, 'hotel_attendance/a1', row)).status()).toBe(200);
    expect((await put(request, 'hotel_attendance/a1', { ...row, checkOut: '06:00 PM', hours: 9 })).status()).toBe(200);
    expect((await put(request, 'hotel_attendance/a1', { ...row, deleted: true })).status()).toBe(200);   // soft delete
    expect((await put(request, 'hotel_attendance/a2', { ...row, staffName: '' })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance/a3', { date: '14 Oct', checkIn: '09:00 AM' })).status()).toBe(403);   // no name
    expect((await put(request, 'hotel_attendance/a4', { ...row, hours: -2 })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance/a5', { ...row, hours: 300 })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance/a6', { ...row, hours: '9' })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance/a7', { ...row, deleted: 'yes' })).status()).toBe(403);
    expect((await put(request, 'hotel_attendance/a8', { ...row, inLoc: 'Panchkula' })).status()).toBe(403);
    expect((await request.delete(`${base}/hotel_attendance/a1`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
});

test('staff PINs: nobody can read them; a check succeeds only with the right hash; first PIN once; a change needs the old PIN', async ({ request }) => {
    const H = (c) => c.repeat(64);
    expect((await put(request, 'hotel_staff_pins/SKY5-030', { h: H('a'), at: 'x' })).status()).toBe(200);
    expect((await request.get(`${base}/hotel_staff_pins/SKY5-030`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);   // never readable
    expect((await put(request, 'hotel_pin_checks/c1', { staffId: 'SKY5-030', h: H('a'), at: 'x' })).status()).toBe(200);   // right PIN
    expect((await put(request, 'hotel_pin_checks/c2', { staffId: 'SKY5-030', h: H('b'), at: 'x' })).status()).toBe(403);   // wrong PIN
    expect((await put(request, 'hotel_pin_checks/c3', { staffId: 'SKY5-031', h: H('a'), at: 'x' })).status()).toBe(403);   // nobody's PIN
    expect((await request.get(`${base}/hotel_pin_checks/c1`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_pins/SKY5-030', { h: H('c'), at: 'x' })).status()).toBe(403);                   // overwrite without the old PIN
    expect((await put(request, 'hotel_staff_pins/SKY5-030', { h: H('c'), at: 'x', old: H('b') })).status()).toBe(403);      // wrong old PIN
    expect((await put(request, 'hotel_staff_pins/SKY5-030', { h: H('c'), at: 'x', old: H('a') })).status()).toBe(200);      // right old PIN
    expect((await put(request, 'hotel_pin_checks/c4', { staffId: 'SKY5-030', h: H('c'), at: 'x' })).status()).toBe(200);
    expect((await put(request, 'hotel_staff_pins/bad', { h: H('a'), at: 'x' })).status()).toBe(403);
    expect((await put(request, 'hotel_staff_pins/SKY5-032', { h: '1234', at: 'x' })).status()).toBe(403);                   // a plain PIN is refused
    expect((await request.delete(`${base}/hotel_staff_pins/SKY5-030`, { headers: { Authorization: `Bearer ${user}` } })).status()).toBe(403);
});
