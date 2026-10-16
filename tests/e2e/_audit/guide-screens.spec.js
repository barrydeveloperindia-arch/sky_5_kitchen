import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { openAdmin } from '../helpers';

// On demand: phone screenshots of the staff page, step by step, for the staff guide video.
//   GUIDE_OUT=<folder> GUIDE_NAMES=<names.json> GUIDE_VIDEO=<face.y4m> npx playwright test tests/e2e/_audit/guide-screens.spec.js --project=desktop
// names.json = { reception: [{ id, name, role, staffId }], kitchen: [...], housekeeping: [...] } (names and posts only)
test.skip(!process.env.GUIDE_OUT, 'guide screenshots run on demand only');
const OUT = process.env.GUIDE_OUT;
test.use({
    viewport: { width: 412, height: 870 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', ...(process.env.GUIDE_VIDEO ? [`--use-file-for-fake-video-capture=${process.env.GUIDE_VIDEO}`] : [])] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 12 },
});

test('guide screens', async ({ page }) => {
    test.setTimeout(240000);
    const shot = (name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await page.addInitScript(() => {
        // the drawn face on the fake camera stands for the staff member; "someone else" for the blocked screen
        const face = (v) => ({ descriptor: Array.from({ length: 128 }, () => v), score: 0.95, width: 380 });
        window.__FACE_TEST__ = { findFaces: () => new Promise(r => setTimeout(() => r([face(localStorage.getItem('faceTest') === 'other' ? 0.5 : 0.01)]), 1600)) };
    });
    await page.clock.install({ time: new Date('2026-10-15T08:58:40') });
    await openAdmin(page);
    await page.waitForTimeout(1500);
    // the staff list of the hotel (names + posts only)
    const project = await page.evaluate(() => localStorage.getItem('sky5_emu_project'));
    const names = JSON.parse(fs.readFileSync(process.env.GUIDE_NAMES, 'utf8'));
    const val = (x) => (typeof x === 'string' ? { stringValue: x } : Array.isArray(x) ? { arrayValue: { values: x.map(val) } } : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, val(y)])) } });
    const reg = { ...names, special: [], dailySchedule: [] };
    const r = await page.request.patch(`http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents/hotel_state/staffRegistry`,
        { headers: { Authorization: 'Bearer owner' }, data: { fields: { value: val(reg) } } });
    expect(r.ok()).toBe(true);

    // the manager registered Varun's face (Workforce -> Face)
    const face = { staffName: val('Varun'), staffId: val('SKY5-004'), source: val('staff-photo'), photoId: val(''), at: val(new Date().toISOString()), reset: { booleanValue: false },
        descriptor: { arrayValue: { values: Array.from({ length: 128 }, () => ({ doubleValue: 0.01 })) } } };
    expect((await page.request.patch(`http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents/hotel_staff_faces/SKY5-004`,
        { headers: { Authorization: 'Bearer owner' }, data: { fields: face } })).ok()).toBe(true);

    await page.goto('/attendance');
    await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 15000 });
    await page.waitForTimeout(600);
    await shot('s1_start');
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-countdown')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(300);
    await shot('s2_countdown');
    await expect(page.getByTestId('att-checking')).toBeVisible({ timeout: 15000 });
    await shot('s3_checking');
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(800);
    await shot('s4_welcome');
    await page.getByRole('button', { name: 'Done' }).click();

    // evening: CHECK OUT
    await page.clock.fastForward('09:00:30');
    await expect(page.getByTestId('att-out')).toBeEnabled();
    await page.getByTestId('att-out').click();
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 20000 });
    await page.waitForTimeout(800);
    await shot('s5_goodbye');
    await page.getByRole('button', { name: 'Done' }).click();

    // a face nobody registered: not recognised, PIN offered
    await page.evaluate(() => localStorage.setItem('faceTest', 'other'));
    await page.clock.fastForward('00:03:00');
    await page.getByTestId('att-in').click();
    await expect(page.getByTestId('att-face-failed')).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(500);
    await shot('s6_not_recognised');
    await page.getByTestId('att-use-pin').click();
    await page.waitForTimeout(600);
    await shot('s7_pin');
});
