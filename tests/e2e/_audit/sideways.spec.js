import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { openAdmin, fakeFaces, seedFace, showFace } from '../helpers';

// On-demand: the staff attendance page with the phone turned sideways (and upright), every step,
// a screenshot each plus what does not fit, for a person to look at.
//   SIDEWAYS_OUT=<folder> npx playwright test tests/e2e/_audit/sideways.spec.js --project=desktop
test.skip(!process.env.SIDEWAYS_OUT, 'runs on demand only');
const OUT = process.env.SIDEWAYS_OUT;
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
});

const SIZES = [['sideways-big', 965, 424], ['sideways', 844, 390], ['sideways-small', 740, 360], ['upright', 424, 965]];
const results = {};
test.afterAll(() => { fs.writeFileSync(path.join(OUT, 'sideways.json'), JSON.stringify(results, null, 2)); });

async function look(page, name, keys) {
    const r = await page.evaluate((ids) => ({
        sideScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        pageHeight: document.documentElement.scrollHeight,
        keys: Object.fromEntries(ids.map(id => {
            const el = document.querySelector(`[data-testid="${id}"]`);
            if (!el) return [id, 'missing'];
            const b = el.getBoundingClientRect();
            return [id, { top: Math.round(b.top), bottom: Math.round(b.bottom), inView: b.top >= 0 && b.bottom <= innerHeight + 1 }];
        })),
    }), keys);
    results[name] = r;
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
}

for (const [label, width, height] of SIZES) {
    test(`attendance ${label}`, async ({ page }) => {
        test.setTimeout(120000);
        await fakeFaces(page);
        await page.setViewportSize({ width, height });
        await expect(async () => {
            await openAdmin(page);
            await page.waitForTimeout(1500);
            await page.goto('/attendance');
            await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 3000 });
        }).toPass({ timeout: 20000 });
        await seedFace(page, 'Varun', 0.01);
        await page.waitForTimeout(800);
        await look(page, `${label}-1-start`, ['att-clock', 'att-in', 'att-out']);
        await page.getByTestId('att-in').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await look(page, `${label}-2-camera`, ['att-video', 'att-capture']);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(700);
        await look(page, `${label}-3-done`, ['att-done', 'att-done-time']);
        await page.getByRole('button', { name: 'Done' }).click();
        await page.getByTestId('att-in').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-notice')).toBeVisible({ timeout: 15000 });
        await look(page, `${label}-4-note`, ['att-notice', 'att-in']);
        await showFace(page, 0.9);
        await page.getByTestId('att-out').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-error')).toBeVisible();
        await page.getByTestId('att-capture').click();
        await expect(page.getByTestId('att-face-failed')).toBeVisible({ timeout: 15000 });
        await look(page, `${label}-5-failed`, ['att-face-failed', 'att-in']);
        await page.getByTestId('att-use-pin').click();
        await expect(page.getByTestId('att-pin-pick')).toBeVisible();
        await page.waitForTimeout(600);
        await look(page, `${label}-6-pin-pick`, ['att-pin-pick']);
    });
}
