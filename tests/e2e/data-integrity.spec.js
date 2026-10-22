import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, waitSaved, fakeFaces, showFace, seedFace, scan } from './helpers';

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
// The staff list is written the first time the OPS Center opens; wait until the terminal has it, then the manager's faces
async function openAttendance(page) {
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 3000 });
        await expect(page.getByTestId('att-counts')).toContainText(/[1-9]\d* staff/, { timeout: 3000 });
    }).toPass({ timeout: 20000 });
    for (const [n, v] of Object.entries(FACE)) await seedFace(page, n, v);
}
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await fakeFaces(page);
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

// --- staff attendance terminal ----------------------------------------------------------------------------------
const FACE = { Varun: 0.01, Bhawna: 0.2, Karan: 0.3, Veerwati: 0.5 };
const STRANGER = 0.9;
const scanDone = async (page, kind) => {
    await scan(page, kind);
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    const t = (await page.getByTestId('att-done-time').innerText()).trim();
    await page.getByRole('button', { name: 'Done' }).click();
    return t;
};

test('staff check-in / check-out on the terminal: the attendance row, both photos, the location and the face check', async ({ page }) => {
    await page.clock.install();
    await openAttendance(page);
    await showFace(page, FACE.Varun);
    const inShown = await scanDone(page, 'in');

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
    expect(row.inFace.check).toBe('matched');
    expect(row.inFace.distance).toBeLessThan(0.6);
    expect(new Date(row.inAt).getTime()).toBeGreaterThan(0);
    const inPhoto = await readDoc(page, `hotel_attendance_photos/${row.inPhotoId}`);
    expect(inPhoto).toMatchObject({ logId: row._id, kind: 'in', staffName: 'Varun' });
    expect(inPhoto.data).toMatch(/^data:image\/jpeg;base64,/);

    await page.clock.fastForward('03:00');
    const outShown = await scanDone(page, 'out');
    await expect.poll(async () => (await readAll(page, 'hotel_attendance')).find(r => r._id === row._id)?.checkOut, { timeout: 15000 }).not.toBe('--');
    row = (await readAll(page, 'hotel_attendance')).find(r => r._id === row._id);
    expect(row.checkOut).toBe(outShown);
    expect(row.outFace.check).toBe('matched');
    expect(row.hours).toBeGreaterThan(0);
    expect(row.hours).toBeLessThan(1);   // a few minutes, saved as hours
    const outPhoto = await readDoc(page, `hotel_attendance_photos/${row.outPhotoId}`);
    expect(outPhoto).toMatchObject({ logId: row._id, kind: 'out', staffName: 'Varun' });
    expect((await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === todayIso() && !r.deleted)).toHaveLength(1);
});

test('a face nobody registered saves nothing: no attendance row, no photo, no face record', async ({ page }) => {
    await openAttendance(page);
    const before = { rows: (await readAll(page, 'hotel_attendance')).length, photos: (await readAll(page, 'hotel_attendance_photos')).length, faces: await readAll(page, 'hotel_staff_faces') };
    await showFace(page, STRANGER);
    await scan(page, 'in');
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');
    await expect(page.getByTestId('att-face-failed')).toBeVisible();
    await page.waitForTimeout(1500);
    expect((await readAll(page, 'hotel_attendance')).length).toBe(before.rows);
    expect((await readAll(page, 'hotel_attendance_photos')).length).toBe(before.photos);
    expect(await readAll(page, 'hotel_staff_faces')).toEqual(before.faces);
});

test('the terminal never changes the staff list (staff only check in / out; changes are made in OPS Center)', async ({ page }) => {
    await page.clock.install();
    await openAttendance(page);
    const before = await readDoc(page, 'hotel_state/staffRegistry');
    await showFace(page, FACE.Bhawna);
    await scanDone(page, 'in');
    await page.clock.fastForward('03:00');
    await scanDone(page, 'out');
    await page.getByTestId('att-pin-link').click();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    expect(await readDoc(page, 'hotel_state/staffRegistry')).toEqual(before);
    for (const id of ['att-edit', 'att-rescan', 'att-delete', 'att-new-staff', 'att-change']) await expect(page.getByTestId(id)).toHaveCount(0);
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
async function otherDevice(browser, project, mobile, faceVal) {
    const ctx = await browser.newContext({
        ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } }),
        permissions: ['camera', 'geolocation'], geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
    });
    await ctx.addInitScript(([p, v]) => {
        localStorage.setItem('sky5_emu_project', p);
        localStorage.setItem('faceVal', String(v));
        const face = (x) => ({ descriptor: Array.from({ length: 128 }, () => x), score: 0.95, width: 400 });
        window.__FACE_TEST__ = { findFaces: () => [face(Number(localStorage.getItem('faceVal')))] };
    }, [project, faceVal]);
    return { ctx, page: await ctx.newPage() };
}

test('live: a check-in on the staff terminal shows in the OPS Center register on the PC without refreshing', async ({ page, browser }) => {
    await openAttendance(page);
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const ledger = page.getByTestId('attendance-ledger');
    await expect(ledger.getByRole('row').filter({ hasText: 'Self check-in (phone)' })).toHaveCount(0);

    const phone = await otherDevice(browser, await projectOf(page), true, FACE.Veerwati);
    await phone.page.goto('/attendance');
    await expect(phone.page.getByTestId('att-in')).toBeEnabled();
    await scan(phone.page, 'in');
    await expect(phone.page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await expect(phone.page.getByTestId('att-done-name')).toHaveText('Veerwati');
    const inTime = (await phone.page.getByTestId('att-done-time').innerText()).trim();

    const row = ledger.getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(row).toHaveCount(1, { timeout: 15000 });   // arrived by itself
    await expect(row).toContainText('Veerwati');
    await expect(row).toContainText(inTime);
    await phone.ctx.close();
});

test('live: a person marked Left on the PC is no longer recognised on the terminal, without refreshing', async ({ page, browser }) => {
    await openAttendance(page);
    const phone = await otherDevice(browser, await projectOf(page), true, FACE.Karan);
    await phone.page.goto('/attendance');
    await expect(phone.page.getByTestId('att-in')).toBeEnabled();
    const staffCount = Number((await phone.page.getByTestId('att-counts').innerText()).match(/(\d+) staff/)[1]);

    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-left-Karan').click();
    await page.getByTestId('sd-left-confirm').click();
    await waitSaved(page);
    await expect(phone.page.getByTestId('att-counts')).toContainText(`${staffCount - 1} staff`, { timeout: 15000 });
    await scan(phone.page, 'in');
    await expect(phone.page.getByTestId('att-error')).toContainText('Face not recognised');
    await phone.ctx.close();
});

test('checked out several times in a day: the LAST check-out is the one saved (one row, hours up to the last scan)', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-15T09:00:00') });
    await openAttendance(page);
    await showFace(page, FACE.Varun);
    const inShown = await scanDone(page, 'in');   // ~09:00
    // four check-outs during the day: lunch, a short trip out, evening, and the real leaving time
    const outs = [];
    for (const later of ['04:00:00', '01:30:00', '03:00:00', '01:15:00']) {
        await page.clock.fastForward(later);
        outs.push(await scanDone(page, 'out'));
    }
    expect(new Set(outs).size).toBe(4);   // each scan moved the check-out

    await expect.poll(async () => (await readAll(page, 'hotel_attendance')).find(r => r.staffName === 'Varun' && r.dateISO === '2026-10-15' && !r.deleted)?.checkOut, { timeout: 15000 }).toBe(outs[3]);
    const rows = (await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === '2026-10-15' && !r.deleted);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.checkIn).toBe(inShown);   // the check-in never moves
    expect(row.checkOut).toBe(outs[3]);  // the last one counts
    const hours = (Date.parse(row.outAt) - Date.parse(row.inAt)) / 3600000;
    expect(hours).toBeGreaterThan(9.7);   // 4 + 1.5 + 3 + 1.25 = 9h 45m (plus the seconds of each scan)
    expect(hours).toBeLessThan(9.9);
    expect(Math.abs(row.hours - hours)).toBeLessThan(0.001);
    const outPhotos = (await readAll(page, 'hotel_attendance_photos')).filter(p => p.logId === row._id && p.kind === 'out');
    expect(outPhotos).toHaveLength(4);
    expect(outPhotos.map(p => p._id)).toContain(row.outPhotoId);

    await openAdmin(page);
    await adminTab(page, 'attendance');
    const reg = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(reg).toHaveCount(1);
    await expect(reg).toContainText(outs[3]);
});

test('name corrected by the manager after the check-in: the next scan is the CHECK OUT on the same row (staff ID)', async ({ page }) => {
    await page.clock.install();
    await openAttendance(page);
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-add').click();
    const form = page.getByTestId('staff-form');
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Rakesh');
    await form.getByLabel('Post', { exact: true }).fill('Helper');
    await page.getByTestId('sf-save').click();
    await waitSaved(page);
    const reg = (await readDoc(page, 'hotel_state/staffRegistry')).value;
    const rakesh = ['reception', 'kitchen', 'housekeeping'].flatMap(k => reg[k] || []).find(s => s.name === 'Rakesh');
    await seedFace(page, 'Rakesh', 0.7, rakesh.staffId);

    await page.goto('/attendance');
    await showFace(page, 0.7);
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await scanDone(page, 'in');
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-edit-Rakesh').click();
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Rakesh Kumar');
    await page.getByTestId('sf-save').click();
    await waitSaved(page);
    await page.goto('/attendance');
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await page.clock.fastForward('03:00');
    await scan(page, 'out');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-name')).toHaveText('Rakesh Kumar');
    const rows = (await readAll(page, 'hotel_attendance')).filter(r => /^Rakesh/.test(r.staffName) && !r.deleted);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ staffName: 'Rakesh Kumar', staffId: rakesh.staffId });
    expect(rows[0].checkOut).not.toBe('--');
});

test('both buttons always on: out, BACK IN, out again - one row, first IN and last OUT; notes for wrong presses; the voice says thank you', async ({ page }) => {
    await page.addInitScript(() => {
        window.__said = [];
        window.speechSynthesis.speak = (u) => window.__said.push(u.text);
        window.speechSynthesis.cancel = () => {};
    });
    await page.clock.install({ time: new Date('2026-10-16T09:00:00') });
    await openAttendance(page);
    await showFace(page, FACE.Varun);
    // CHECK OUT before any check-in: a note
    await scan(page, 'out');
    await expect(page.getByTestId('att-notice')).toContainText('CHECK IN first');
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await scanDone(page, 'in');
    // CHECK IN again while in: a note (no double entry)
    await page.clock.fastForward('01:00:00');
    await scan(page, 'in');
    await expect(page.getByTestId('att-notice')).toContainText('already checked in since');
    await expect(page.getByTestId('att-in')).toBeEnabled();
    // check out (by mistake / a break)
    await scan(page, 'out');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();
    // still working: BACK IN
    await page.clock.fastForward('00:30:00');
    await scan(page, 'in');
    await expect(page.getByTestId('att-done')).toContainText('Back In Successful', { timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();
    // leaving for the day
    await page.clock.fastForward('07:00:00');
    await scan(page, 'out');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });

    const rows = (await readAll(page, 'hotel_attendance')).filter(r => r.staffName === 'Varun' && r.dateISO === '2026-10-16' && !r.deleted);
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.checkIn).toBe('09:00 AM');
    expect(r.checkOut).toBe((await page.getByTestId('att-done-time').innerText()).trim());
    expect(r.backs).toHaveLength(1);
    expect(r.backs[0].afterOut).toMatch(/^10:0\d AM$/);
    expect(r.hours).toBeGreaterThan(8.4);   // 09:00 -> ~17:30: first IN to last OUT
    await expect.poll(() => page.evaluate(() => window.__said)).toEqual(expect.arrayContaining([
        expect.stringMatching(/^Good morning Varun\. Check in successful/),
        expect.stringMatching(/^Thank you Varun\. Check out successful/),
        expect.stringMatching(/^Welcome back Varun/),
    ]));
});
