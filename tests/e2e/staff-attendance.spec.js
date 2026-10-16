import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, openAdmin, adminTab, waitSaved, fakeFaces, showFace, seedFace, scan } from './helpers';

// Staff attendance terminal (/attendance), like the AuraLock face terminal: no name is chosen - the person presses
// CHECK IN or CHECK OUT, looks at the camera, and the face says who it is. Photo + location with every entry.
// Chromium's fake camera stands in for the phone camera; a stand-in face engine returns the face we ask for.
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },   // inside Hotel Sky 5 (about 10 m from the map pin)
});

// each person's face (registered by the manager); 0.9 is a face nobody registered
const FACE = { Varun: 0.01, Bhawna: 0.2, Karan: 0.3, Ratnesh: 0.4, Veerwati: 0.5 };
const STRANGER = 0.9;

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await page.clock.install();
    await fakeFaces(page);
    // Opening the OPS Center writes the staff register (test names) into this emulator project.
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 3000 });
        await expect(page.getByTestId('att-counts')).toContainText(/[1-9]\d* staff/, { timeout: 3000 });
    }).toPass({ timeout: 25000 });
    for (const [name, v] of Object.entries(FACE)) await seedFace(page, name, v);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

const done = async (page) => { await page.getByRole('button', { name: 'Done' }).click(); await expect(page.getByTestId('att-done')).toHaveCount(0); };

test('start screen: clock, CHECK IN + CHECK OUT, nothing to choose or edit, fits the phone', async ({ page }) => {
    await expect(page.getByTestId('att-clock')).toBeVisible();
    await expect(page.getByTestId('att-in')).toHaveText(/CHECK IN/);
    await expect(page.getByTestId('att-out')).toHaveText(/CHECK OUT/);
    // staff can only check in / out: no name list, no "Not you?", no edit / re-scan / delete / new staff
    for (const id of ['att-pick-Varun', 'att-change', 'att-edit', 'att-rescan', 'att-delete', 'att-new-staff', 'att-edit-Varun']) await expect(page.getByTestId(id)).toHaveCount(0);
    await expect(page.getByText('Varun')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect((await page.locator('body').innerText()).toLowerCase()).not.toMatch(/englabs|auralock/);
});

test('the face says who it is: check in, notes instead of double entries, check out; the register has one row with both photos', async ({ page }) => {
    await showFace(page, FACE.Varun);
    await scan(page, 'in');
    const result = page.getByTestId('att-done');
    await expect(result).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-name')).toHaveText('Varun');
    await expect(page.getByTestId('att-face')).toContainText('Face verified');
    await expect(page.getByTestId('att-place')).toContainText('At Hotel Sky 5');
    const inTime = (await page.getByTestId('att-done-time').textContent()).trim();
    await done(page);
    await expect(page.getByTestId('att-counts')).toContainText('1 in now');

    // CHECK IN again: no second entry, a note with the name
    await scan(page, 'in');
    await expect(page.getByTestId('att-notice')).toContainText('Varun');
    await expect(page.getByTestId('att-notice')).toContainText(`already checked in since ${inTime}`);
    // CHECK OUT right away: the 2-minute guard
    await scan(page, 'out');
    await expect(page.getByTestId('att-notice')).toContainText('Just saved');

    await page.clock.fastForward('03:00');
    await scan(page, 'out');
    await expect(result).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-name')).toHaveText('Varun');
    await done(page);
    await expect(page.getByTestId('att-counts')).toContainText('1 left');

    // OPS Center register: one row for Varun today, marked as a phone check-in, with both photos
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const rowsForVarun = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(rowsForVarun).toHaveCount(1, { timeout: 15000 });
    await expect(rowsForVarun).toContainText('Varun');
    await expect(rowsForVarun).toContainText(inTime);
    await rowsForVarun.locator('[data-testid^="att-proof-in-"]').click();
    await expect(page.getByRole('img', { name: 'Selfie of Varun' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(rowsForVarun.locator('[data-testid^="att-proof-out-"]')).toBeVisible();
    await expect(rowsForVarun.getByRole('link', { name: 'Location of Varun' }).first()).toHaveAttribute('href', 'https://www.google.com/maps?q=30.72135,76.8526');
});

test('CHECK OUT before any check-in today: a note, nothing saved', async ({ page }) => {
    await showFace(page, FACE.Bhawna);
    await scan(page, 'out');
    await expect(page.getByTestId('att-notice')).toContainText('Bhawna');
    await expect(page.getByTestId('att-notice')).toContainText('Not checked in yet');
    await expect(page.getByTestId('att-counts')).toContainText('0 in now');
});

test('two people take turns on the same phone: each one is recognised and gets their own entry', async ({ page }) => {
    await showFace(page, FACE.Varun);
    await scan(page, 'in');
    await expect(page.getByTestId('att-done-name')).toHaveText('Varun', { timeout: 15000 });
    await done(page);
    await showFace(page, FACE.Bhawna);
    await scan(page, 'in');
    await expect(page.getByTestId('att-done-name')).toHaveText('Bhawna', { timeout: 15000 });
    await done(page);
    await expect(page.getByTestId('att-counts')).toContainText('2 in now');
});

test('a face nobody registered: not recognised (said aloud), nothing saved; Try again and Use PIN are offered', async ({ page }) => {
    await page.addInitScript(() => { window.__said = []; window.speechSynthesis.speak = (u) => window.__said.push(u.text); window.speechSynthesis.cancel = () => {}; });
    await page.reload();
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await showFace(page, STRANGER);
    await page.getByTestId('att-in').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');   // asks once more on the camera
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-face-failed')).toContainText('Face not recognised');
    await expect(page.getByTestId('att-video')).toHaveCount(0);
    await expect(page.getByTestId('att-try-again')).toBeVisible();
    await expect(page.getByTestId('att-use-pin')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__said)).toContain('Face not recognised. Please try again.');
    await expect(page.getByTestId('att-counts')).toContainText('0 in now');
    // the right person tries again
    await showFace(page, FACE.Karan);
    await page.getByTestId('att-try-again').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done-name')).toHaveText('Karan', { timeout: 15000 });
});

test('two registered faces almost the same: no guess - asks for a better photo', async ({ page }) => {
    await seedFace(page, 'Karan', 0.02);   // nearly the same face as Varun (0.01)
    await showFace(page, 0.015);
    await scan(page, 'in');
    await expect(page.getByTestId('att-error')).toContainText('Come closer and look straight');
    await expect(page.getByTestId('att-video')).toBeVisible();
    await expect(page.getByTestId('att-done')).toHaveCount(0);
});

for (const [mode, faces, msg] of [['no face', 'none', 'No face found']]) {
    test(`a photo with ${mode} is not saved, the camera asks again`, async ({ page }) => {
        await showFace(page, faces);
        await scan(page, 'in');
        await expect(page.getByTestId('att-error')).toContainText(msg);
        await expect(page.getByTestId('att-video')).toBeVisible();
        await expect(page.getByTestId('att-countdown')).toBeVisible({ timeout: 10000 });   // counting down again
        await showFace(page, FACE.Veerwati);
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });          // the automatic photo
        await expect(page.getByTestId('att-done-name')).toHaveText('Veerwati');
    });
}

test('nobody in front of the camera: after a few tries it closes by itself, nothing saved', async ({ page }) => {
    await showFace(page, 'none');
    await page.getByTestId('att-in').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    for (let i = 0; i < 4; i++) {
        await page.getByTestId('att-capture').click();
        if (i < 3) await expect(page.getByTestId('att-countdown')).toBeVisible({ timeout: 10000 });
    }
    await expect(page.getByTestId('att-video')).toHaveCount(0);
    await expect(page.getByTestId('att-face-failed')).toBeVisible();
    await expect(page.getByTestId('att-counts')).toContainText('0 in now');
});

test('someone marked Left is not recognised any more', async ({ page, context }) => {
    const admin = await context.newPage();
    await openAdmin(admin);
    await adminTab(admin, 'workforce');
    await admin.getByTestId('sd-left-Karan').click();
    await admin.getByTestId('sd-left-confirm').click();
    await waitSaved(admin);
    await admin.close();
    await showFace(page, FACE.Karan);
    await page.getByTestId('att-in').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');
});

test('a row the manager already made for today is used, not duplicated', async ({ page }) => {
    const today = await page.evaluate(() => `${String(new Date().getDate()).padStart(2, '0')}-${new Date().toLocaleString('en-US', { month: 'short' })}`);
    await openAdmin(page);
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: '+ MANUAL LOG' }).click();
    await page.locator('select').filter({ hasText: 'Select Staff...' }).selectOption('Karan');
    await page.getByPlaceholder('e.g., 06-May').fill(today);
    await page.getByRole('button', { name: 'SAVE LOG' }).click();
    await waitSaved(page);
    const karanToday = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Karan' }).filter({ hasText: today });
    await expect(karanToday).toHaveCount(1);

    await page.goto('/attendance');
    await showFace(page, FACE.Karan);
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await scan(page, 'in');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await done(page);
    await openAdmin(page);
    await adminTab(page, 'attendance');
    await expect(karanToday).toHaveCount(1);
    await expect(karanToday.getByRole('button', { name: 'CHECK-IN', exact: true })).toHaveCount(0);   // the scan filled that row
    await expect(karanToday.locator('[data-testid^="att-proof-in-"]')).toBeVisible();
});

test('night shift: next morning CHECK OUT closes last night, on the same row', async ({ page }) => {
    const evening = new Date(); evening.setHours(19, 0, 0, 0);
    await page.clock.setSystemTime(evening);
    await showFace(page, FACE.Ratnesh);
    await scan(page, 'in');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await done(page);
    await page.clock.fastForward('13:00:00');   // into the next day, inside the 16 h shift limit
    await scan(page, 'out');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done')).toContainText('13h 00m');
});

test('Cancel closes the camera without saving; the photo is taken by itself after a 2-second countdown', async ({ page }) => {
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-video')).toBeVisible();
    await page.getByTestId('att-cancel').click();
    await expect(page.getByTestId('att-video')).toHaveCount(0);
    expect(await page.evaluate(() => [...document.querySelectorAll('video')].filter(v => v.srcObject).length)).toBe(0);   // camera really off
    await showFace(page, FACE.Bhawna);
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-countdown')).toHaveText('2', { timeout: 10000 });   // 2 seconds, then the photo
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });   // nobody pressed the scan button
    await expect(page.getByTestId('att-done-name')).toHaveText('Bhawna');
});

test('no accessibility / colour-contrast issues on any screen (WCAG 2 AA)', async ({ page }) => {
    const found = [];
    const check = async (name) => {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('[aria-hidden="true"]').analyze();
        for (const v of r.violations) found.push(`${name}: ${v.id} -> ${v.nodes[0].target.join(' ')}`);
    };
    await check('start');
    await showFace(page, FACE.Varun);
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-video')).toBeVisible();
    await check('camera');
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);   // the tick has popped in
    await check('result');
    await done(page);
    await scan(page, 'in');
    await expect(page.getByTestId('att-notice')).toBeVisible();
    await check('note');
    await showFace(page, STRANGER);
    await scan(page, 'out');
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-face-failed')).toBeVisible();
    await check('not recognised');
    expect(found).toEqual([]);
});

for (const [w, h, label] of [[320, 568, 'small phone'], [360, 740, 'normal phone'], [430, 932, 'big phone'], [740, 360, 'phone sideways']]) {
    test(`${label} ${w}x${h}: nothing cut off, no sideways scroll, buttons on screen`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await noOverflow();
        for (const id of ['att-clock', 'att-in', 'att-out']) {
            const box = await page.getByTestId(id).boundingBox();
            expect(box, id).not.toBeNull();
            expect(box.x, `${id} left edge`).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width, `${id} right edge`).toBeLessThanOrEqual(w + 1);
        }
        expect(await page.getByTestId('att-clock').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await showFace(page, FACE.Varun);
        await page.getByTestId('att-in').scrollIntoViewIfNeeded();
        await page.getByTestId('att-in').click();
        await expect(page.getByTestId('att-video')).toBeVisible();
        await expect(page.getByTestId('att-capture')).toBeInViewport();   // full-screen camera: always on screen
        await noOverflow();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
        await noOverflow();
        await page.getByRole('button', { name: 'Done' }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', { name: 'Done' })).toBeInViewport();
    });
}

test('a scan away from the hotel is saved but flagged: the result says so, the register shows OUTSIDE with the distance', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 30.69421, longitude: 76.86068, accuracy: 15 });   // about 3.4 km away
    await showFace(page, FACE.Varun);
    await scan(page, 'in');
    await expect(page.getByTestId('att-place')).toContainText('Outside the hotel', { timeout: 15000 });
    await expect(page.getByTestId('att-place')).toContainText('km away');
    await done(page);
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const row = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(row.locator('[data-testid^="att-outside-in-"]')).toHaveText(/OUTSIDE \d+\.\d km/);
});

test('the hotel app has an Attendance button that opens this page, and this page links back', async ({ page }) => {
    await page.getByTestId('att-back').click();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await page.getByText('Attendance', { exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/attendance$/);
    await expect(page.getByTestId('staff-attendance')).toBeVisible();
});

test('the face scans of today from the attendance terminal show in the register (read only) and in Present Today', async ({ page }) => {
    const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    await page.route('http://board.test/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ companies: [{ company: 'Sky5 Hotel', staff: [
        { name: 'Board Person', employeeId: 'SKY5-099', status: 'Present', in: hhmm(new Date(Date.now() - 3600000)), out: '' },
        { name: 'Zed Notscanned', employeeId: 'SKY5-098', status: 'Not in yet', in: '', out: '' }] }] }) }));
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const row = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Board Person' });
    await expect(row).toContainText('Face scan (terminal) · SKY5-099');
    await expect(row.getByRole('button', { name: 'CHECK-OUT', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Zed Notscanned' })).toHaveCount(0);
    await expect(page.getByTestId('att-present-today')).toHaveText('1 STAFF');
});

test('camera refused: clear message, nothing saved', async ({ page, context }) => {
    await context.clearPermissions();
    await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
    await page.reload();
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-face-failed')).toContainText('Camera permission is needed');
    await expect(page.getByTestId('att-counts')).toContainText('0 in now');
});
