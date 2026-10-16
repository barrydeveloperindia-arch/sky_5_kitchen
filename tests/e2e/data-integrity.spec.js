import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, waitSaved } from './helpers';

// What reaches the database is exactly what was entered: every test does something on the screen, then reads
// the saved record straight from the database (emulator, admin read) and checks each field and each sum.
test.skip(({ isMobile }) => isMobile, 'database checks, once is enough');
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
});

// --- reading the emulator as admin (rules bypassed) ---------------------------------------------------------
const fromValue = (v) => {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
    if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
    if ('timestampValue' in v) return v.timestampValue;
    return v;
};
const fromDoc = (d) => ({ _id: d.name.split('/').pop(), ...Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, fromValue(x)])) });
const projectOf = (page) => page.evaluate(() => localStorage.getItem('sky5_emu_project'));
const base = (project) => `http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents`;
async function readDoc(page, path) {
    const r = await page.request.get(`${base(await projectOf(page))}/${path}`, { headers: { Authorization: 'Bearer owner' } });
    return r.ok() ? fromDoc(await r.json()) : null;
}
async function readAll(page, coll) {
    const r = await page.request.get(`${base(await projectOf(page))}/${coll}?pageSize=500`, { headers: { Authorization: 'Bearer owner' } });
    const j = await r.json();
    return (j.documents || []).map(fromDoc);
}
// The staff list is written the first time the OPS Center opens; wait until the phone page shows it
async function openAttendance(page) {
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-pick-Varun')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
}
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await page.addInitScript(() => {
        const face = (v) => ({ descriptor: Array.from({ length: 128 }, () => v), score: 0.95, width: 400 });
        window.__FACE_TEST__ = { findFaces: () => [face(localStorage.getItem('faceTest') === 'other' ? 0.5 : 0.01)] };
    });
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('shop order: the saved kitchen order has the same items, quantities, prices and sum as the invoice', async ({ page }) => {
    await page.goto('/');
    const card = (name) => page.locator('.modern-item-card', { has: page.locator('.item-title-modern', { hasText: name }) });
    await card('Aloo Paratha Combo').locator('.add-btn-square').click();
    await card('Aloo Paratha Combo').locator('.add-btn-square').click();
    await page.locator('.filter-chip', { hasText: 'Beverages' }).click();
    await card('Tea').first().locator('.add-btn-square').click();
    await page.locator('.cart-floating-bar').click();
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Table 7');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    const invoiceTotal = Number((await page.getByTestId('invoice-total').innerText()).replace(/[^\d]/g, ''));

    await expect.poll(async () => (await readAll(page, 'hotel_orders')).filter(o => o.table === 'Table 7').length, { timeout: 15000 }).toBe(1);
    const [order] = (await readAll(page, 'hotel_orders')).filter(o => o.table === 'Table 7');
    expect(order.status).toBe('Pending');
    expect(order.items).toBe('2x Aloo Paratha Combo, 1x Tea');
    const lines = order.details.map(d => ({ name: d.name, qty: d.quantity, price: d.price }));
    expect(lines).toEqual([{ name: 'Aloo Paratha Combo', qty: 2, price: 169 }, { name: 'Tea', qty: 1, price: 50 }]);
    const subtotal = order.details.reduce((s, d) => s + d.price * d.quantity, 0);
    expect(subtotal).toBe(388);
    expect(invoiceTotal).toBe(subtotal + Math.round(subtotal * 0.05));   // invoice = food + 5% GST
    expect(order.id).toMatch(/^SKY5-[A-Z0-9]+$/);
});

test('room check-in and check-out: the room, the guest and the settlement are saved with the right numbers', async ({ page }) => {
    await openAdmin(page);
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('Data Check Guest');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await waitSaved(page);
    const room = await readDoc(page, 'hotel_rooms/2');
    expect(room.status).toBe('Occupied');
    expect(room.guest.name).toBe('Data Check Guest');
    expect(typeof room.price).toBe('number');
    expect(room.price).toBeGreaterThan(0);

    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-OUT' }).click();
    await page.locator('label', { hasText: 'Inspected By' }).locator('..').locator('select').selectOption({ index: 1 });
    page.on('dialog', d => d.accept());
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    await expect(page.getByTestId('room-card-2')).toContainText('TO CLEAN');
    await waitSaved(page);

    const after = await readDoc(page, 'hotel_rooms/2');
    expect(after.status).toBe('Dirty');
    expect(after.guest.name).toBe('Data Check Guest');   // kept for the record
    expect(after.guest.checkedOutAt).toBeGreaterThan(0);
    const settlement = (await readAll(page, 'hotel_settlements')).find(s => s.guest === 'Data Check Guest');
    expect(settlement).toBeTruthy();
    expect(settlement.roomId).toBe(2);
    for (const k of ['total', 'advance', 'collected', 'refund', 'nights']) expect(typeof settlement[k], k).toBe('number');
    expect(settlement.nights).toBeGreaterThanOrEqual(1);
    // money adds up: what was collected + the advance - any refund = the bill
    expect(settlement.collected + settlement.advance - settlement.refund).toBe(settlement.total);
    const log = (await readAll(page, 'hotel_checkout_logs')).find(l => l.roomNumber === 2 && l.date === settlement.date);
    expect(log).toBeTruthy();
    expect(log.staffName).toBeTruthy();
});

test('staff check-in / check-out on the phone page: the attendance row, both selfies, the location and the face record', async ({ page }) => {
    await page.clock.install();
    await openAttendance(page);
    await page.getByTestId('att-pick-Varun').click();
    const snapTap = async () => {
        await page.getByTestId('att-tap').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: 'Done' }).click();
    };
    await snapTap();
    const inShown = (await page.getByTestId('att-in-time').innerText()).trim();

    await expect.poll(async () => (await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === todayIso() && !r.deleted).length, { timeout: 15000 }).toBe(1);
    let row = (await readAll(page, 'hotel_attendance')).find(r => r.staffName === 'Varun' && r.dateISO === todayIso() && !r.deleted);
    expect(row.checkIn).toBe(inShown);
    expect(row.checkIn).toMatch(/^\d\d:\d\d (AM|PM)$/);
    expect(row.checkOut).toBe('--');
    expect(row.status).toBe('Present');
    expect(row.source).toBe('staff-web');
    expect(row.inLoc).toEqual({ lat: 30.72135, lng: 76.8526, acc: 15 });
    expect(row.inAtHotel).toBe(true);
    expect(row.inDistM).toBeLessThan(50);
    expect(row.inFace.check).toBe('registered');
    expect(new Date(row.inAt).getTime()).toBeGreaterThan(0);
    const inPhoto = await readDoc(page, `hotel_attendance_photos/${row.inPhotoId}`);
    expect(inPhoto).toMatchObject({ logId: row._id, kind: 'in', staffName: 'Varun' });
    expect(inPhoto.data).toMatch(/^data:image\/jpeg;base64,/);
    const faces = await readAll(page, 'hotel_staff_faces');
    const varunFace = faces.find(f => f.staffName === 'Varun');
    expect(varunFace.source).toBe('first-check-in');
    expect(varunFace.descriptor).toHaveLength(128);
    expect(varunFace.photoId).toBe(row.inPhotoId);

    await page.clock.fastForward('03:00');
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK OUT/, { timeout: 20000 });
    await snapTap();
    await expect.poll(async () => (await readAll(page, 'hotel_attendance')).find(r => r._id === row._id)?.checkOut, { timeout: 15000 }).not.toBe('--');
    row = (await readAll(page, 'hotel_attendance')).find(r => r._id === row._id);
    expect(row.checkOut).toBe((await page.getByTestId('att-out-time').innerText()).trim());
    expect(row.outFace.check).toBe('matched');
    expect(row.outFace.distance).toBeLessThan(0.6);
    expect(row.hours).toBeGreaterThan(0);
    expect(row.hours).toBeLessThan(1);   // a few minutes, saved as hours
    const outPhoto = await readDoc(page, `hotel_attendance_photos/${row.outPhotoId}`);
    expect(outPhoto).toMatchObject({ logId: row._id, kind: 'out', staffName: 'Varun' });
    // exactly one row for Varun today (no duplicate from the second tap)
    expect((await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === todayIso() && !r.deleted)).toHaveLength(1);
});

test('a refused face saves nothing: no attendance row, no selfie, no face record', async ({ page }) => {
    await openAttendance(page);
    await page.getByTestId('att-pick-Bhawna').click();
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });   // Bhawna registers
    await page.getByRole('button', { name: 'Done' }).click();
    const before = { rows: (await readAll(page, 'hotel_attendance')).length, photos: (await readAll(page, 'hotel_attendance_photos')).length, faces: await readAll(page, 'hotel_staff_faces') };

    // someone else picks Veerwati with Bhawna's face: refused (that face is Bhawna's)
    await page.getByTestId('att-change').click();
    await page.getByTestId('att-pick-Veerwati').click();
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-error')).toContainText('already registered for Bhawna');
    await page.waitForTimeout(1500);
    expect((await readAll(page, 'hotel_attendance')).length).toBe(before.rows);
    expect((await readAll(page, 'hotel_attendance_photos')).length).toBe(before.photos);
    expect(await readAll(page, 'hotel_staff_faces')).toEqual(before.faces);
});

test('staff directory: a new person is saved with the next staff ID, a clean mobile and Active; Left saves the last day', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-add').click();
    const form = page.getByTestId('staff-form');
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Data Check Person');
    await form.getByLabel('Post', { exact: true }).fill('Helper');
    await form.getByLabel('Mobile', { exact: true }).fill('+91 99999 00001');
    await page.getByTestId('sf-save').click();
    await waitSaved(page);
    const reg = (await readDoc(page, 'hotel_state/staffRegistry')).value;
    const all = ['reception', 'kitchen', 'housekeeping'].flatMap(k => reg[k] || []);
    const p = all.find(s => s.name === 'Data Check Person');
    expect(p).toMatchObject({ role: 'Helper', phone: '9999900001', status: 'Active' });
    const ids = all.map(s => s.staffId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);   // no two people share an ID
    expect(p.staffId).toMatch(/^SKY5-\d{3}$/);
    expect(Number(p.staffId.slice(5))).toBe(Math.max(...ids.map(i => Number(i.slice(5)))));   // the next number

    await page.getByTestId('sd-left-Data Check Person').click();
    await page.getByTestId('sd-left-date').fill('2026-10-01');
    await page.getByTestId('sd-left-confirm').click();
    await waitSaved(page);
    const reg2 = (await readDoc(page, 'hotel_state/staffRegistry')).value;
    const p2 = ['reception', 'kitchen', 'housekeeping'].flatMap(k => reg2[k] || []).find(s => s.name === 'Data Check Person');
    expect(p2).toMatchObject({ status: 'Left', leftDate: '2026-10-01', staffId: p.staffId, phone: '9999900001' });
});

// --- live: two devices on the same database, no refresh -------------------------------------------------------
async function otherDevice(browser, project, mobile) {
    const ctx = await browser.newContext({
        ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } }),
        permissions: ['camera', 'geolocation'], geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
    });
    await ctx.addInitScript(p => {
        localStorage.setItem('sky5_emu_project', p);
        const face = (v) => ({ descriptor: Array.from({ length: 128 }, () => v), score: 0.95, width: 400 });
        window.__FACE_TEST__ = { findFaces: () => [face(0.01)] };
    }, project);
    return { ctx, page: await ctx.newPage() };
}

test('live: a check-in on a staff phone shows in the OPS Center register on the PC without refreshing', async ({ page, browser }) => {
    await openAttendance(page);   // PC side: OPS Center opened once (staff list written)
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const ledger = page.getByTestId('attendance-ledger');
    await expect(ledger.getByRole('row').filter({ hasText: 'Self check-in (phone)' })).toHaveCount(0);

    const phone = await otherDevice(browser, await projectOf(page), true);
    await phone.page.goto('/attendance');
    await phone.page.getByTestId('att-pick-Veerwati').click();
    await phone.page.getByTestId('att-tap').click();
    await expect.poll(() => phone.page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await phone.page.getByTestId('att-capture').click();
    await expect(phone.page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    const inTime = (await phone.page.getByTestId('att-done-time').innerText()).trim();

    const row = ledger.getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(row).toHaveCount(1, { timeout: 15000 });   // arrived by itself
    await expect(row).toContainText('Veerwati');
    await expect(row).toContainText(inTime);
    await phone.ctx.close();
});

test('live: a person marked Left on the PC disappears from the staff phone list without refreshing', async ({ page, browser }) => {
    await openAttendance(page);
    const phone = await otherDevice(browser, await projectOf(page), true);
    await phone.page.goto('/attendance');
    await expect(phone.page.getByTestId('att-pick-Karan')).toBeVisible();

    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-left-Karan').click();
    await page.getByTestId('sd-left-confirm').click();
    await waitSaved(page);
    await expect(phone.page.getByTestId('att-pick-Karan')).toHaveCount(0, { timeout: 15000 });
    await expect(phone.page.getByTestId('att-pick-Varun')).toBeVisible();
    await phone.ctx.close();
});

test('checked out several times in a day: the LAST check-out is the one saved (one row, hours up to the last tap)', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-15T09:00:00') });
    await openAttendance(page);
    await page.getByTestId('att-pick-Varun').click();
    const tap = async () => {
        await page.getByTestId('att-tap').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: 'Done' }).click();
    };
    await tap();   // CHECK IN ~09:00
    const inShown = (await page.getByTestId('att-in-time').innerText()).trim();
    // four check-outs during the day: lunch, a short trip out, evening, and the real leaving time
    const outs = [];
    for (const later of ['04:00:00', '01:30:00', '03:00:00', '01:15:00']) {
        await page.clock.fastForward(later);
        await expect(page.getByTestId('att-tap')).toHaveText(/CHECK OUT/, { timeout: 20000 });
        await tap();
        outs.push((await page.getByTestId('att-out-time').innerText()).trim());
    }
    expect(new Set(outs).size).toBe(4);   // each tap moved the check-out
    await expect(page.getByTestId('att-in-time')).toHaveText(inShown);   // the check-in never moves

    await expect.poll(async () => (await readAll(page, 'hotel_attendance')).find(r => r.staffName === 'Varun' && r.dateISO === '2026-10-15' && !r.deleted)?.checkOut, { timeout: 15000 }).toBe(outs[3]);
    const rows = (await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === '2026-10-15' && !r.deleted);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.checkIn).toBe(inShown);
    expect(row.checkOut).toBe(outs[3]);   // the last one counts
    const hours = (Date.parse(row.outAt) - Date.parse(row.inAt)) / 3600000;
    expect(hours).toBeGreaterThan(9.7);   // 4 + 1.5 + 3 + 1.25 = 9h 45m (plus the seconds of each tap)
    expect(hours).toBeLessThan(9.9);
    expect(Math.abs(row.hours - hours)).toBeLessThan(0.001);
    await expect(page.getByTestId('att-hours')).toHaveText(/^9h 4\dm$/);
    // every check-out selfie is kept as proof; the row points to the last one
    const outPhotos = (await readAll(page, 'hotel_attendance_photos')).filter(p => p.logId === row._id && p.kind === 'out');
    expect(outPhotos).toHaveLength(4);
    expect(outPhotos.map(p => p._id)).toContain(row.outPhotoId);

    // the OPS Center register shows the same: one row, last check-out
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const reg = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(reg).toHaveCount(1);
    await expect(reg).toContainText(outs[3]);
});

test('a new person registers on the staff page ("New staff register"), is saved with the next staff ID and can check in', async ({ page }) => {
    await openAttendance(page);
    await page.getByTestId('att-new-staff').click();
    const form = page.getByTestId('staff-form');
    await expect(form).toBeVisible();
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Naya Staff');
    await form.getByLabel('Department', { exact: true }).selectOption('kitchen');
    await form.getByLabel('Post', { exact: true }).fill('Cook');
    await form.getByLabel('Mobile', { exact: true }).fill('9999900002');
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('att-me')).toHaveText('Naya Staff');   // chosen straight away
    await expect.poll(async () => ((await readDoc(page, 'hotel_state/staffRegistry'))?.value?.kitchen || []).some(s => s.name === 'Naya Staff'), { timeout: 15000 }).toBe(true);
    const reg = (await readDoc(page, 'hotel_state/staffRegistry')).value;
    const p = reg.kitchen.find(s => s.name === 'Naya Staff');
    expect(p).toMatchObject({ role: 'Cook', phone: '9999900002', status: 'Active' });
    expect(p.staffId).toMatch(/^SKY5-\d{3}$/);
    expect(reg.reception.length).toBeGreaterThan(0);   // the other lists were not touched
    // and the first check-in works (face registered)
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).toContainText('Face registered');
});

test('staff page: Edit details saves the change (also a corrected name), Re-scan face replaces the face, Delete marks as left and keeps old attendance', async ({ page }) => {
    await openAttendance(page);
    await page.getByTestId('att-pick-Varun').click();
    // first check-in registers a face (a row exists for today)
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();

    // 1. Edit details: new post and a corrected name
    await page.getByTestId('att-edit').click();
    const form = page.getByTestId('staff-form');
    await expect(form).toBeVisible();
    await form.getByLabel('Post', { exact: true }).fill('Head Waiter');
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Varun Kumar');
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('att-me')).toHaveText('Varun Kumar');
    await expect.poll(async () => ((await readDoc(page, 'hotel_state/staffRegistry'))?.value?.kitchen || []).find(s => s.name === 'Varun Kumar')?.role, { timeout: 15000 }).toBe('Head Waiter');

    // 2. Re-scan face: the box shows the registered face, a new face is taken and saved
    await page.getByTestId('att-rescan').click();
    await expect(page.getByTestId('face-dialog')).toContainText('Face of Varun Kumar');
    await page.evaluate(() => localStorage.setItem('faceTest', 'other'));
    await page.getByTestId('face-take').click();
    await expect.poll(() => page.getByTestId('face-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('face-scan').click();
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);
    await expect.poll(async () => (await readAll(page, 'hotel_staff_faces')).find(f => f.staffName === 'Varun Kumar')?.source, { timeout: 15000 }).toBe('staff-photo');

    // 3. Delete (= left today): off the list, old attendance kept
    page.once('dialog', d => d.accept());
    await page.getByTestId('att-delete').click();
    await expect(page.getByTestId('att-pick-Varun Kumar')).toHaveCount(0);
    await expect(page.getByTestId('att-pick-Veerwati')).toBeVisible();
    await expect.poll(async () => ((await readDoc(page, 'hotel_state/staffRegistry'))?.value?.kitchen || []).find(s => s.name === 'Varun Kumar')?.status, { timeout: 15000 }).toBe('Left');
    expect((await readAll(page, 'hotel_attendance')).filter(r => r.source === 'staff-web' && !r.deleted).length).toBeGreaterThan(0);
});

test('staff page: Delete can be cancelled - nothing changes', async ({ page }) => {
    await openAttendance(page);
    await page.getByTestId('att-pick-Bhawna').click();
    page.once('dialog', d => d.dismiss());
    await page.getByTestId('att-delete').click();
    await expect(page.getByTestId('att-me')).toHaveText('Bhawna');
    await page.waitForTimeout(800);
    expect(((await readDoc(page, 'hotel_state/staffRegistry'))?.value?.housekeeping || []).find(s => s.name === 'Bhawna')?.status).not.toBe('Left');
});

test('name corrected after the check-in: the next tap is the CHECK OUT on the same row (not a second check-in)', async ({ page }) => {
    await page.clock.install();
    await openAttendance(page);
    await page.getByTestId('att-new-staff').click();
    const form = page.getByTestId('staff-form');
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Rakesh');
    await form.getByLabel('Post', { exact: true }).fill('Helper');
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('att-me')).toHaveText('Rakesh');
    const tap = async () => {
        await page.getByTestId('att-tap').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: 'Done' }).click();
    };
    await tap();   // CHECK IN as "Rakesh"
    await page.getByTestId('att-edit').click();
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Rakesh Kumar');
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('att-me')).toHaveText('Rakesh Kumar');
    await expect(page.getByTestId('att-in-time')).not.toHaveText('--');   // still checked in
    await page.clock.fastForward('03:00');
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK OUT/, { timeout: 20000 });
    await tap();
    const rows = (await readAll(page, 'hotel_attendance')).filter(r => /^Rakesh/.test(r.staffName) && !r.deleted);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ staffName: 'Rakesh Kumar' });
    expect(rows[0].staffId).toMatch(/^SKY5-\d{3}$/);
    expect(rows[0].checkOut).not.toBe('--');
});

test('name list: the pencil next to a name edits that person (saved in the database), without choosing the name', async ({ page }) => {
    await openAttendance(page);
    await page.getByTestId('att-edit-Bhawna').click();
    const form = page.getByTestId('staff-form');
    await expect(form).toBeVisible();
    await expect(form.getByLabel('Full name (as on Aadhaar)', { exact: true })).toHaveValue('Bhawna');
    await form.getByLabel('Post', { exact: true }).fill('Housekeeping Lead');
    await form.getByLabel('Mobile', { exact: true }).fill('9999900003');
    await page.getByTestId('sf-save').click();
    await expect(form).toHaveCount(0);
    await expect(page.getByTestId('att-pick-Bhawna')).toContainText('Housekeeping Lead');   // still on the list, not chosen
    await expect(page.getByTestId('att-me')).toHaveCount(0);
    await expect.poll(async () => ((await readDoc(page, 'hotel_state/staffRegistry'))?.value?.housekeeping || []).find(s => s.name === 'Bhawna'), { timeout: 15000 })
        .toMatchObject({ role: 'Housekeeping Lead', phone: '9999900003' });
});

test('both buttons always on: out, BACK IN, out again - one row, first IN and last OUT; notes for wrong presses; the voice says thank you', async ({ page }) => {
    await page.addInitScript(() => {
        window.__said = [];
        window.speechSynthesis.speak = (u) => window.__said.push(u.text);
        window.speechSynthesis.cancel = () => {};
    });
    await page.clock.install({ time: new Date('2026-10-16T09:00:00') });
    await openAttendance(page);
    await page.getByTestId('att-pick-Varun').click();
    const shoot = async () => {
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    };
    // CHECK OUT before any check-in: a note
    await page.getByTestId('att-out').click();
    await expect(page.getByTestId('att-notice')).toContainText('CHECK IN first');
    // check in
    await page.getByTestId('att-tap').click();
    await shoot();
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful');
    await page.getByRole('button', { name: 'Done' }).click();
    // CHECK IN again while in: a note (no double entry)
    await page.clock.fastForward('01:00:00');
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-notice')).toContainText('already checked in since');
    // check out (by mistake / a break)
    await page.getByTestId('att-tap').click();
    await shoot();
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful');
    await page.getByRole('button', { name: 'Done' }).click();
    // still working: BACK IN
    await page.clock.fastForward('00:30:00');
    await expect(page.getByTestId('att-in')).toContainText('back in');
    await page.getByTestId('att-in').click();
    await shoot();
    await expect(page.getByTestId('att-done')).toContainText('Back In Successful');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('att-out-time')).toHaveText('--');
    // leaving for the day
    await page.clock.fastForward('07:00:00');
    await page.getByTestId('att-tap').click();
    await shoot();
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful');

    const rows = (await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === '2026-10-16' && !r.deleted);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.checkIn).toBe('09:00 AM');
    expect(r.checkOut).toBe((await page.getByTestId('att-done-time').innerText()).trim());
    expect(r.backs).toHaveLength(1);
    expect(r.backs[0].afterOut).toMatch(/^10:0\d AM$/);
    expect(r.hours).toBeGreaterThan(8.4);   // 09:00 -> ~17:30: first IN to last OUT
    // spoken like the AuraLock terminal
    const said = await page.evaluate(() => window.__said);
    expect(said).toEqual(expect.arrayContaining([
        expect.stringMatching(/^Good morning Varun\. Check in successful/),
        expect.stringMatching(/^Thank you Varun\. Check out successful/),
        expect.stringMatching(/^Welcome back Varun/),
    ]));
});
