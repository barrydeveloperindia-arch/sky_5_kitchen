import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';

// Someone's face was registered on the wrong name (e.g. Bhawna checked in as Varun the first time).
// The manager opens Staff Directory -> Varun -> Face, sees the wrong selfie, takes Varun's real face, and
// from then on Varun matches and Bhawna can register her own face. Like re-registering a face in AuraLock.
test.skip(({ isMobile }) => isMobile, 'manager screen on the PC');
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
});

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    // the camera "sees" whoever localStorage faceTest names: V = Varun, B = Bhawna
    await page.addInitScript(() => {
        const face = (v) => ({ descriptor: Array.from({ length: 128 }, () => v), score: 0.95, width: 400 });
        window.__FACE_TEST__ = { findFaces: () => [face(localStorage.getItem('faceTest') === 'B' ? 0.3 : 0.01)] };
    });
    await page.clock.install();
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-pick-Varun')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 20000 });
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

// SHOTS=<folder>: also save screenshots of the Face box (for a person to look at)
const snap = (page, name) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : null);
const who = (page, w) => page.evaluate((x) => localStorage.setItem('faceTest', x), w);
async function phoneTap(page, name) {
    // wait for the page: either a remembered name or the name list
    await expect(page.getByTestId('att-me').or(page.getByTestId(`att-pick-${name}`))).toBeVisible();
    if (!(await page.getByTestId('att-me').isVisible()) || (await page.getByTestId('att-me').innerText()) !== name) {
        if (await page.getByTestId('att-change').isVisible()) await page.getByTestId('att-change').click();
        await page.getByTestId(`att-pick-${name}`).click();
    }
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
}
async function openFace(page, name) {
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId(`sd-face-open-${name}`).click();
    await expect(page.getByTestId('face-dialog')).toBeVisible();
}
async function takeFace(page) {
    await page.getByTestId('face-take').click();
    await expect.poll(() => page.getByTestId('face-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('face-scan').click();
}

test('wrong face on a name: the manager sees it, takes the right face, and both people work again', async ({ page }) => {
    // 1. by mistake Bhawna does the first check-in as Varun: her face is registered for Varun
    await who(page, 'B');
    await phoneTap(page, 'Varun');
    await expect(page.getByTestId('att-face')).toContainText('Face registered');
    await page.getByRole('button', { name: 'Done' }).click();
    // 2. now Bhawna cannot check in as herself (her face belongs to "Varun")
    await phoneTap(page, 'Bhawna');
    await expect(page.getByTestId('att-error')).toContainText('already registered for Varun');

    // 3. manager: Varun -> Face shows the selfie it came from, then takes Varun's real face
    await openFace(page, 'Varun');
    await expect(page.getByTestId('face-source')).toContainText('first check-in');
    await expect(page.getByTestId('face-current')).toBeVisible();
    await snap(page, 'face1_view');
    await who(page, 'V');
    await takeFace(page);
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await snap(page, 'face2_review');
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);
    await snap(page, 'face3_list');
    await expect(page.getByTestId('sd-face-Varun')).toContainText('Face from photo');
    await page.getByTestId('sd-face-open-Varun').click();
    await expect(page.getByTestId('face-source')).toContainText('taken by the manager');
    await page.keyboard.press('Escape');

    // 4. Varun's face matches Varun; Bhawna registers her own face
    await page.goto('/attendance');
    await page.clock.fastForward('03:00');
    await who(page, 'V');
    await phoneTap(page, 'Varun');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).toContainText('Face verified');
    await page.getByRole('button', { name: 'Done' }).click();
    await who(page, 'B');
    await phoneTap(page, 'Bhawna');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).toContainText('Face registered');
});

test('with a staff ID the new face is also saved as the staff photo (ID card, lists)', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-add').click();
    const form = page.getByTestId('staff-form');
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Face Person');
    await form.getByLabel('Post', { exact: true }).fill('Helper');
    await page.getByTestId('sf-save').click();
    await page.getByTestId('sd-face-open-Face Person').click();
    await who(page, 'V');
    await takeFace(page);
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('sd-row-Face Person').getByRole('img', { name: 'Photo of Face Person' })).toBeVisible();
    await expect(page.getByTestId('sd-face-Face Person')).toContainText('Face from photo');
});

test('the manager cannot give one person the face of another (and is told what to do)', async ({ page }) => {
    await who(page, 'V');
    await phoneTap(page, 'Varun');   // Varun registers his face
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await openFace(page, 'Bhawna');
    await expect(page.getByTestId('face-source')).toContainText('No face registered yet');
    await takeFace(page);   // the camera sees Varun
    await expect(page.getByTestId('face-error')).toContainText('already registered for Varun');
    await expect(page.getByTestId('face-error')).toContainText('Reset first');
    await snap(page, 'face4_blocked');
    await expect(page.getByTestId('face-save')).toHaveCount(0);
});

test('Reset: the face is forgotten and the next check-in registers again', async ({ page }) => {
    await who(page, 'B');
    await phoneTap(page, 'Varun');
    await expect(page.getByTestId('att-done')).toBeVisible({ timeout: 15000 });
    await openFace(page, 'Varun');
    page.once('dialog', d => d.accept());
    await page.getByTestId('face-reset').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);
    await expect(page.getByTestId('sd-face-Varun')).toContainText('Face not set yet');
    // the next check-in (now with Varun's real face) registers it
    await page.goto('/attendance');
    await page.clock.fastForward('03:00');
    await who(page, 'V');
    await phoneTap(page, 'Varun');
    await expect(page.getByTestId('att-face')).toContainText('Face registered', { timeout: 15000 });
});
