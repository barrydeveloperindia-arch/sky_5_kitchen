import { test, expect } from '@playwright/test';

// Security rules on the emulator, called the way a phone would (signed-in anonymous user).
test.skip(({ isMobile }) => isMobile, 'no browser needed');

const project = `demo-rules-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const user = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'qa', user_id: 'qa', aud: project, iss: `https://securetoken.google.com/${project}`, iat: 1, exp: 9999999999, firebase: { sign_in_provider: 'anonymous' } })}.`;
const base = `http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents`;
const v = (x) => (typeof x === 'number' ? { integerValue: String(x) } : typeof x === 'string' ? { stringValue: x } : x === null ? { nullValue: null } : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } });
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
