import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, seedFace, fakeFaces, cameraUp } from './helpers';

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

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await fakeFaces(page);
    await page.setViewportSize(PORTRAIT);
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
    await seedFace(page, 'Varun', 0.01);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('staff terminal: turning the phone at every step keeps the screen whole and the check-in going', async ({ page }) => {
    for (const vp of [SIDEWAYS, PORTRAIT]) {
        await page.setViewportSize(vp);
        expect(await sideScroll(page), `start screen ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
        expect(await inView(page, page.getByTestId('att-in')), `CHECK IN ${vp.width}x${vp.height}`).toBe(true);
        expect(await inView(page, page.getByTestId('att-out')), `CHECK OUT ${vp.width}x${vp.height}`).toBe(true);
        expect(await downScroll(page), `start screen ${vp.width}x${vp.height} needs no scrolling`).toBeLessThanOrEqual(1);
    }
    // sideways = two columns: the clock on the left, the buttons on the right
    await page.setViewportSize(SIDEWAYS);
    const clock = await page.getByTestId('att-clock').boundingBox();
    const btn = await page.getByTestId('att-in').boundingBox();
    expect(btn.x, 'buttons beside the clock, not under it').toBeGreaterThan(clock.x + clock.width);
    await page.setViewportSize(PORTRAIT);
    // turn while the camera is open: the camera keeps running and the scan button stays on screen
    await page.evaluate(() => localStorage.setItem('faceVal', 'none'));   // nobody yet: the camera stays open while the phone turns
    await page.getByTestId('att-in').click();
    await cameraUp(page);
    await page.setViewportSize(SIDEWAYS);
    await expect(page.getByTestId('att-video')).toBeVisible();
    expect(await inView(page, page.getByTestId('att-cancel')), 'scan button visible sideways without scrolling').toBe(true);
    expect(await page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    expect(await sideScroll(page)).toBeLessThanOrEqual(1);
    await page.setViewportSize(PORTRAIT);
    expect(await inView(page, page.getByTestId('att-cancel'))).toBe(true);
    await page.evaluate(() => localStorage.setItem('faceVal', '0.01'));   // now Varun looks at the camera
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    // and the result screen also fits both ways
    for (const vp of [SIDEWAYS, PORTRAIT]) {
        await page.setViewportSize(vp);
        expect(await sideScroll(page), `result ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1);
        expect(await inView(page, page.getByRole('button', { name: 'Done' })), `result ${vp.width}x${vp.height}: all on one screen`).toBe(true);
    }
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('att-counts')).toContainText('1 in now');   // the check-in was not lost
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
