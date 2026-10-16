import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, openAdmin, adminTab, waitSaved } from './helpers';

// The hotel TV board (/tv): every working staff member, phone check-ins and tablet face scans together,
// live without refreshing, Hotel Sky 5 only (no other brand), fits a TV screen.
test.skip(({ isMobile }) => isMobile, 'TV screen');
test.use({
    viewport: { width: 1920, height: 1080 },
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
});

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
let errors;
test.beforeEach(async ({ page, context }) => {
    errors = trackErrors(page);
    // the hotel tablet: Bhawna scanned her face an hour ago
    await context.route('http://board.test/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ companies: [{ company: 'Sky5 Hotel', staff: [
        { name: 'Bhawna', employeeId: 'SKY5-013', status: 'Present', in: hhmm(new Date(Date.now() - 3600000)), out: '' }] }] }) }));
    await context.addInitScript(() => {
        window.__FACE_TEST__ = { findFaces: () => [{ descriptor: Array.from({ length: 128 }, () => 0.01), score: 0.95, width: 400 }] };
    });
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/tv');
        await expect(page.getByTestId('tv-row-Varun')).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 25000 });
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('shows every staff member, the tablet scan, and a phone check-in arrives live (no refresh)', async ({ page, context }) => {
    await expect(page.getByTestId('hotel-tv')).toContainText('HOTEL SKY 5');
    await expect(page.getByTestId('tv-status-Bhawna')).toHaveText(/Present|Late/);   // from the tablet
    await expect(page.getByTestId('tv-status-Varun')).toHaveText('Not in yet');
    const notIn = Number(await page.getByTestId('tv-notin').innerText());

    // Varun checks in on his phone
    const phone = await context.newPage();
    await phone.goto('/attendance');
    await phone.getByTestId('att-pick-Varun').click();
    await phone.getByTestId('att-tap').click();
    await expect.poll(() => phone.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await phone.getByTestId('att-capture').click();
    await expect(phone.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    const inTime = (await phone.getByTestId('att-done-time').innerText()).trim();

    // the TV updates by itself
    await expect(page.getByTestId('tv-in-Varun')).toHaveText(inTime, { timeout: 15000 });
    await expect(page.getByTestId('tv-status-Varun')).not.toHaveText('Not in yet');
    await expect(page.getByTestId('tv-notin')).toHaveText(String(notIn - 1));
    await expect(page.getByTestId('tv-latest')).toContainText('Varun');
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/tv.png` });   // for a person to look at
});

test('someone marked Left disappears from the TV', async ({ page, context }) => {
    await expect(page.getByTestId('tv-row-Karan')).toBeVisible();
    const admin = await context.newPage();
    await openAdmin(admin);
    await adminTab(admin, 'workforce');
    await admin.getByTestId('sd-left-Karan').click();
    await admin.getByTestId('sd-left-confirm').click();
    await waitSaved(admin);
    await expect(page.getByTestId('tv-row-Karan')).toHaveCount(0, { timeout: 15000 });
});

test('a TV screen: everything fits (no scrolling), readable contrast, only Hotel Sky 5 branding', async ({ page }) => {
    await expect(page.getByTestId('tv-clock')).toHaveText(/^\d\d:\d\d:\d\d$/);
    const fit = await page.evaluate(() => ({ x: document.documentElement.scrollWidth - innerWidth, y: document.documentElement.scrollHeight - innerHeight }));
    expect(fit.x).toBeLessThanOrEqual(1);
    expect(fit.y).toBeLessThanOrEqual(1);
    expect((await page.locator('body').innerText()).toLowerCase()).not.toMatch(/englabs|auralock/);
    expect(await page.title()).toBe('Hotel Sky 5 · Staff attendance');
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});

test('every row is on the screen - with 9 staff and with 20 staff', async ({ page }) => {
    const inView = async () => page.evaluate(() => [...document.querySelectorAll('[data-testid^="tv-row-"]')].every(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 1 && b.height > 10; }));
    expect(await inView()).toBe(true);
    // a bigger hotel team: 20 people
    const project = await page.evaluate(() => localStorage.getItem('sky5_emu_project'));
    const v = (x) => (typeof x === 'string' ? { stringValue: x } : Array.isArray(x) ? { arrayValue: { values: x.map(v) } } : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } });
    const person = (d, i) => ({ id: `${d}${i}`, name: `Staff ${d} ${i}`, role: 'Helper', staffId: `SKY5-${String(100 + i).padStart(3, '0')}` });
    const reg = { reception: Array.from({ length: 7 }, (_, i) => person('R', i)), kitchen: Array.from({ length: 7 }, (_, i) => person('K', i + 10)), housekeeping: Array.from({ length: 6 }, (_, i) => person('H', i + 20)), special: [], dailySchedule: [] };
    const r = await page.request.patch(`http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents/hotel_state/staffRegistry`, { headers: { Authorization: 'Bearer owner' }, data: { fields: { value: v(reg) } } });
    expect(r.ok()).toBe(true);
    await expect(page.locator('[data-testid^="tv-row-"]')).toHaveCount(20, { timeout: 15000 });
    expect(await inView()).toBe(true);
    await expect(page.getByTestId('tv-staff')).toHaveText('20');
});

for (const [label, vp] of [['phone', { width: 390, height: 844 }], ['upright tablet', { width: 768, height: 1024 }]]) {
    test(`on a ${label} the board is a clean list: nothing cut or squeezed, no sideways scroll, readable`, async ({ page }) => {
        await page.setViewportSize(vp);
        await expect(page.getByTestId('tv-row-Varun')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        // the status pill is on one line and inside the screen
        const pill = await page.getByTestId('tv-status-Varun').boundingBox();
        expect(pill.height).toBeLessThan(40);
        expect(pill.x + pill.width).toBeLessThanOrEqual(vp.width);
        await expect(page.getByTestId('tv-clock')).toHaveText(/^\d\d:\d\d:\d\d$/);
        const clock = await page.getByTestId('tv-clock').boundingBox();
        expect(clock.x + clock.width).toBeLessThanOrEqual(vp.width);
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
}
