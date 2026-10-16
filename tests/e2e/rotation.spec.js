import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';

// Turning the phone / tablet while using the app: the screen re-lays itself out, nothing is cut off or
// scrolls sideways, the main button stays reachable and nothing that was going on is lost.
test.skip(({ isMobile }) => isMobile, 'the sizes are set here');
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
    hasTouch: true,
});

const PORTRAIT = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };
const sideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const downScroll = (page) => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
// fully visible without scrolling
const inView = async (page, loc) => {
    const b = await loc.boundingBox();
    const vp = page.viewportSize();
    return !!b && b.y >= 0 && b.y + b.height <= vp.height + 1 && b.x >= 0 && b.x + b.width <= vp.width + 1;
};
const onScreen = async (page, loc) => {
    const box = await loc.boundingBox();
    const vp = page.viewportSize();
    return !!box && box.x >= 0 && box.x + box.width <= vp.width + 1;
};

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await page.addInitScript(() => {
        window.__FACE_TEST__ = { findFaces: () => [{ descriptor: Array.from({ length: 128 }, () => 0.01), score: 0.95, width: 400 }] };
    });
    await page.setViewportSize(PORTRAIT);
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-pick-Varun')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('staff page: turning the phone at every step keeps the screen whole and the check-in going', async ({ page }) => {
    for (const vp of [SIDEWAYS, PORTRAIT]) {
        await page.setViewportSize(vp);
        expect(await sideScroll(page), `name list ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
        await expect(page.getByTestId('att-pick-Varun')).toBeVisible();
    }
    await page.getByTestId('att-pick-Varun').click();
    for (const vp of [SIDEWAYS, PORTRAIT]) {
        await page.setViewportSize(vp);
        expect(await sideScroll(page), `start screen ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
        await page.getByTestId('att-tap').scrollIntoViewIfNeeded();
        expect(await onScreen(page, page.getByTestId('att-tap'))).toBe(true);
    }
    // sideways = two columns: who / clock / times on the left, the big panel with both buttons on the right, no scrolling
    await page.setViewportSize(SIDEWAYS);
    const me = await page.getByTestId('att-me').boundingBox();
    const panel = await page.getByTestId('att-panel').boundingBox();
    expect(panel.x, 'panel beside the name, not under it').toBeGreaterThan(me.x + me.width);
    expect(panel.height, 'panel uses the screen height').toBeGreaterThan(SIDEWAYS.height * 0.6);
    expect(await inView(page, page.getByTestId('att-tap'))).toBe(true);
    expect(await inView(page, page.getByTestId('att-out'))).toBe(true);
    expect(await downScroll(page), 'start screen sideways needs no scrolling').toBeLessThanOrEqual(1);
    await page.setViewportSize(PORTRAIT);
    // turn while the camera is open: the camera keeps running and the photo button stays on screen
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.setViewportSize(SIDEWAYS);
    await expect(page.getByTestId('att-video')).toBeVisible();
    expect(await inView(page, page.getByTestId('att-capture')), 'photo button visible sideways without scrolling').toBe(true);
    expect(await page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    expect(await sideScroll(page)).toBeLessThanOrEqual(1);
    await page.getByTestId('att-capture').scrollIntoViewIfNeeded();
    expect(await onScreen(page, page.getByTestId('att-capture'))).toBe(true);
    await page.setViewportSize(PORTRAIT);
    await page.getByTestId('att-capture').click();
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    // and the success screen also fits both ways
    for (const vp of [SIDEWAYS, PORTRAIT]) {
        await page.setViewportSize(vp);
        expect(await sideScroll(page), `done screen ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
        if (vp === SIDEWAYS) expect(await inView(page, page.getByRole('button', { name: 'Done' })), 'done screen sideways: all on one screen').toBe(true);
        await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('att-in-time')).not.toHaveText('--');   // the check-in was not lost
});

for (const [name, a, b] of [['phone', PORTRAIT, SIDEWAYS], ['tablet', { width: 768, height: 1024 }, { width: 1024, height: 768 }]]) {
    test(`OPS Center on a ${name}: every section re-lays out when turned (no sideways scroll, menu reachable)`, async ({ page }) => {
        await page.setViewportSize(a);
        await openAdmin(page);
        for (const tab of ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'workforce', 'attendance', 'finance', 'menu-config']) {
            for (const vp of [a, b]) {
                await page.setViewportSize(vp);
                const nav = page.getByTestId(`nav-${tab}`);
                if (!(await nav.isVisible())) await page.getByRole('button', { name: /open menu|menu/i }).first().click();
                await adminTab(page, tab);
                await page.waitForTimeout(250);
                expect(await sideScroll(page), `${tab} at ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
                await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
            }
        }
    });
}

test('shop: turning the phone keeps the cart and the menu fits both ways', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('.modern-item-card').first();
    await card.locator('.add-btn-square').click();
    for (const vp of [SIDEWAYS, PORTRAIT, SIDEWAYS]) {
        await page.setViewportSize(vp);
        expect(await sideScroll(page), `shop ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
        await expect(page.locator('.cart-floating-bar')).toContainText('1 Item');
    }
});
