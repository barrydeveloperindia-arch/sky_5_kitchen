import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, openAdmin, adminTab, waitSaved } from './helpers';

// Staff self check-in / check-out on their own phone (/attendance): selfie + location with every tap.
// Chromium's fake camera stands in for the phone camera; the location is a fixed test point.
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },   // inside Hotel Sky 5 (about 10 m from the map pin)
});

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await page.clock.install();
    // Opening the OPS Center writes the staff register (test names) into this emulator project.
    // That first write is not waited for by the page, so give it a moment and retry until it is there.
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-pick-Varun')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

const tapAndSnap = async (page) => {
    await page.getByTestId('att-tap').click();
    await expect(page.getByTestId('att-video')).toBeVisible();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
};

test('fits the phone screen and lists the staff to choose from', async ({ page }) => {
    await expect(page.getByTestId('att-pick-Varun')).toBeVisible();
    await expect(page.getByTestId('att-pick-Veerwati')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
});

test('check in, 2-minute guard, rolling check out; the register shows the selfie and location', async ({ page }) => {
    await page.getByTestId('att-pick-Varun').click();
    await expect(page.getByTestId('att-me')).toHaveText('Varun');
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK IN/);

    await tapAndSnap(page);
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful');
    await expect(page.getByTestId('att-place')).toContainText('At Hotel Sky 5');
    const inTime = (await page.getByTestId('att-done-time').textContent()).trim();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('att-in-time')).toHaveText(inTime);
    await expect(page.getByTestId('att-wait')).toBeVisible(); // a second tap right away does nothing
    await expect(page.getByTestId('att-wait-count')).toHaveText(/in [12]:\d\d/); // the countdown is on the CHECK OUT button
    await expect(page.getByTestId('att-tap-off-out')).toBeDisabled();

    // the phone remembers who this is
    await page.reload();
    await expect(page.getByTestId('att-me')).toHaveText('Varun');
    await expect(page.getByTestId('att-in-time')).toHaveText(inTime);

    await page.clock.fastForward('03:00');
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK OUT/, { timeout: 20000 });
    await tapAndSnap(page);
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('att-out-time')).not.toHaveText('--');

    // OPS Center register: one row for Varun today, marked as a phone check-in, with both selfies
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const ledger = page.getByTestId('attendance-ledger');
    const rowsForVarun = ledger.getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(rowsForVarun).toHaveCount(1);
    await expect(rowsForVarun).toContainText('Varun');
    await expect(rowsForVarun).toContainText(inTime);
    await rowsForVarun.locator('[data-testid^="att-proof-in-"]').click();
    await expect(page.getByRole('img', { name: 'Selfie of Varun' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(rowsForVarun.locator('[data-testid^="att-proof-out-"]')).toBeVisible();
    await expect(rowsForVarun.getByRole('link', { name: 'Location of Varun' }).first()).toHaveAttribute('href', 'https://www.google.com/maps?q=30.72135,76.8526');
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
    await expect(karanToday.getByRole('button', { name: 'CHECK-IN', exact: true })).toBeVisible();

    await page.goto('/attendance');
    await page.getByTestId('att-pick-Karan').click();
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK IN/);
    await tapAndSnap(page);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('att-in-time')).not.toHaveText('--');
    await openAdmin(page);
    await adminTab(page, 'attendance');
    await expect(karanToday).toHaveCount(1);
    await expect(karanToday.getByRole('button', { name: 'CHECK-IN', exact: true })).toHaveCount(0); // the staff tap filled that row
    await expect(karanToday.locator('[data-testid^="att-proof-in-"]')).toBeVisible();
    await expect(karanToday).toContainText('Self check-in (phone)');
});

test('night shift: next morning the tap is the CHECK OUT of last night, on the same row', async ({ page }) => {
    // start at 19:00 so +13 h is always the next morning, whatever time the test runs
    const evening = new Date(); evening.setHours(19, 0, 0, 0);
    await page.clock.setSystemTime(evening);
    await page.getByTestId('att-pick-Ratnesh').click();
    await tapAndSnap(page);
    await page.getByRole('button', { name: 'Done' }).click();
    const inDate = await page.evaluate(() => `${String(new Date().getDate()).padStart(2, '0')}-${new Date().toLocaleString('en-US', { month: 'short' })}`);
    await page.clock.fastForward('13:00:00'); // into the next calendar day, inside the 16 h shift limit
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK OUT/, { timeout: 20000 });
    await expect(page.getByTestId('att-night')).toContainText(inDate);
    await tapAndSnap(page);
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful');
    await expect(page.getByTestId('att-done')).toContainText('13h 00m');
});

test('name list is grouped by department and the search finds a name', async ({ page }) => {
    for (const h of ['Front Desk & Management', 'Kitchen', 'Housekeeping']) await expect(page.getByRole('heading', { name: h, exact: true })).toBeVisible();
    await page.getByTestId('att-search').fill('bhaw');
    await expect(page.getByTestId('att-pick-Bhawna')).toBeVisible();
    await expect(page.getByTestId('att-pick-Varun')).toHaveCount(0);
    await page.getByTestId('att-search').fill('zzz');
    await expect(page.getByTestId('att-no-match')).toBeVisible();
    await page.getByTestId('att-search').fill('');
    await expect(page.getByTestId('att-pick-Varun')).toBeVisible();
});

test('every button: Not you? changes the name, Cancel closes the camera without saving', async ({ page }) => {
    await page.getByTestId('att-pick-Bhawna').click();
    await expect(page.getByTestId('att-me')).toHaveText('Bhawna');
    await page.getByTestId('att-change').click();
    await expect(page.getByTestId('att-pick-Varun')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('att-pick-Varun')).toBeVisible(); // forgotten on this phone too
    await page.getByTestId('att-pick-Varun').click();
    await page.getByTestId('att-tap').click();
    await expect(page.getByTestId('att-video')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('att-in-time')).toHaveText('--');
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK IN/);
    expect(await page.evaluate(() => [...document.querySelectorAll('video')].filter(v => v.srcObject).length)).toBe(0); // camera really off
});

test('no accessibility / colour-contrast issues on any screen (WCAG 2 AA)', async ({ page }) => {
    const found = [];
    const check = async (name) => {
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('[aria-hidden="true"]').analyze();
        for (const v of r.violations) found.push(`${name}: ${v.id} -> ${v.nodes[0].target.join(' ')}`);
    };
    await check('choose name');
    await page.getByTestId('att-pick-Varun').click();
    await check('check-in screen');
    await page.getByTestId('att-tap').click();
    await expect(page.getByTestId('att-video')).toBeVisible();
    await check('camera');
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await check('check-in done');
    await page.getByRole('button', { name: 'Done' }).click();
    await check('wait screen');
    expect(found).toEqual([]);
});

for (const [w, h, label] of [[320, 568, 'small phone'], [360, 740, 'normal phone'], [430, 932, 'big phone'], [740, 360, 'phone sideways']]) {
    test(`${label} ${w}x${h}: nothing cut off, no sideways scroll, main buttons on screen`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
        await noOverflow();
        await page.getByTestId('att-pick-Varun').click();
        await noOverflow();
        for (const id of ['att-me', 'att-clock', 'att-tap', 'att-in-time', 'att-change']) {
            const box = await page.getByTestId(id).boundingBox();
            expect(box, id).not.toBeNull();
            expect(box.x, `${id} left edge`).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width, `${id} right edge`).toBeLessThanOrEqual(w + 1);
        }
        // the clock text fits its box (no clipped digits)
        expect(await page.getByTestId('att-clock').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        await page.getByTestId('att-tap').scrollIntoViewIfNeeded();
        await page.getByTestId('att-tap').click();
        await expect(page.getByTestId('att-video')).toBeVisible();
        await expect(page.getByTestId('att-capture')).toBeInViewport(); // on screen without scrolling, also sideways
        await noOverflow();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
        await noOverflow();
        await page.getByRole('button', { name: 'Done' }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', { name: 'Done' })).toBeInViewport();
    });
}

test('after choosing a name the screen starts at the top and the title bar does not cover the panel', async ({ page }) => {
    await page.setViewportSize({ width: 740, height: 360 }); // phone sideways: the name list is long
    await page.getByTestId('att-pick-Amresh Kumar').scrollIntoViewIfNeeded();
    await page.getByTestId('att-pick-Amresh Kumar').click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const pos = await page.getByRole('banner').evaluate(el => getComputedStyle(el).position);
    expect(pos).not.toBe('sticky');
    expect(pos).not.toBe('fixed');
});

test('a tap away from the hotel is saved but flagged: staff see it, the register shows OUTSIDE with the distance', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 30.69421, longitude: 76.86068, accuracy: 15 });   // about 3.4 km away
    await page.getByTestId('att-pick-Varun').click();
    await tapAndSnap(page);
    await expect(page.getByTestId('att-place')).toContainText('Outside the hotel');
    await expect(page.getByTestId('att-place')).toContainText('km away');
    await page.getByRole('button', { name: 'Done' }).click();
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const row = page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Self check-in (phone)' });
    await expect(row.locator('[data-testid^="att-outside-in-"]')).toHaveText(/OUTSIDE \d+\.\d km/);
});

test('the hotel app has an Attendance button that opens this page, and this page links back', async ({ page }) => {
    await page.getByTestId('att-back').click();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    // phone: bottom bar; wide screen: top menu
    await page.getByText('Attendance', { exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/attendance$/);
    await expect(page.getByTestId('staff-attendance')).toBeVisible();
});

test('camera refused: clear message, nothing saved', async ({ page, context }) => {
    await context.clearPermissions();
    await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError')); });
    await page.reload();
    await page.getByTestId('att-pick-Varun').click();
    await page.getByTestId('att-tap').click();
    await expect(page.getByTestId('att-error')).toContainText('Camera permission is needed');
    await expect(page.getByTestId('att-in-time')).toHaveText('--');
});
