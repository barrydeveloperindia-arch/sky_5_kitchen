import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, fakeFaces, showFace, seedFace, scan } from './helpers';

// Faces are managed in OPS Center -> Workforce -> Face (like re-registering a face in AuraLock). If a face was saved
// on the wrong name, the terminal takes that person for someone else - the manager takes the right face and
// from then on the terminal recognises both people correctly.
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
    await fakeFaces(page);
    await page.clock.install();
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

// SHOTS=<folder>: also save screenshots of the Face box (for a person to look at)
const snap = (page, name) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : null);
const V = 0.01, B = 0.3;   // Varun's face, Bhawna's face
const who = (page, w) => showFace(page, w === 'V' ? V : B);
// on the terminal: scan, and say whom it recognised (or null)
async function terminalScan(page, kind = 'in') {
    await page.goto('/attendance');
    await expect(page.getByTestId('att-in')).toBeEnabled();
    await scan(page, kind);
    await expect(page.getByTestId('att-done').or(page.getByTestId('att-error')).or(page.getByTestId('att-notice'))).toBeVisible({ timeout: 15000 });
    return (await page.getByTestId('att-done-name').count()) ? (await page.getByTestId('att-done-name').innerText()).trim() : null;
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

test('wrong face on a name: the terminal takes Bhawna for Varun - the manager takes the right faces and both are recognised', async ({ page }) => {
    // 1. by mistake Bhawna's face was saved as Varun's
    await seedFace(page, 'Varun', B);
    await who(page, 'B');
    expect(await terminalScan(page, 'in')).toBe('Varun');   // wrong person!

    // 2. manager: Varun -> Face shows the face, takes Varun's real face
    await openFace(page, 'Varun');
    await expect(page.getByTestId('face-source')).not.toContainText('No face registered yet');   // a face is there
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
    // and Bhawna's face for Bhawna
    await who(page, 'B');
    await page.getByTestId('sd-face-open-Bhawna').click();
    await takeFace(page);
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);

    // 3. the terminal now recognises each of them
    await page.clock.fastForward('03:00');
    await who(page, 'V');
    expect(await terminalScan(page, 'out')).toBe('Varun');
    await expect(page.getByTestId('att-face')).toContainText('Face verified');
    await who(page, 'B');
    expect(await terminalScan(page, 'in')).toBe('Bhawna');
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

test('registering a face for someone with no face is never refused because of another person: no "already registered" message', async ({ page }) => {
    await seedFace(page, 'Varun', V);
    await openFace(page, 'Bhawna');
    await expect(page.getByTestId('face-source')).toContainText('No face registered yet');
    await who(page, 'V');   // the face in front of the camera is nearly / exactly another person's registered face
    await takeFace(page);
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('face-error')).toHaveCount(0);
    await expect(page.getByTestId('face-dialog')).not.toContainText(/already registered|looks a little like|Reset first/);
    await snap(page, 'face4_no_block');
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);
    await expect(page.getByTestId('sd-face-Bhawna')).toContainText('Face from photo');
});

test('Reset: the face is forgotten - the terminal no longer recognises it', async ({ page }) => {
    await seedFace(page, 'Varun', B);
    await openFace(page, 'Varun');
    page.once('dialog', d => d.accept());
    await page.getByTestId('face-reset').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);
    await expect(page.getByTestId('sd-face-Varun')).toContainText('Face not set yet');
    await who(page, 'B');
    expect(await terminalScan(page, 'in')).toBe(null);
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');
});

test('Staff Directory says clearly who has no face yet; "Register face" opens the camera box and the name goes off the list', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'workforce');
    const box = page.getByTestId('sd-faces-missing');
    await expect(box).toContainText('Face not registered');
    await expect(page.getByTestId('sd-register-face-Ratnesh')).toBeVisible();
    await expect(page.getByTestId('sd-face-open-Ratnesh')).toHaveText(/Register face/);
    await expect(page.getByTestId('sd-face-Ratnesh')).toContainText('Register');
    await page.getByTestId('sd-register-face-Ratnesh').click();
    await expect(page.getByTestId('face-dialog')).toContainText('Face of Ratnesh');
    await who(page, 'V');
    await takeFace(page);
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('sd-register-face-Ratnesh')).toHaveCount(0);
    await expect(page.getByTestId('sd-face-Ratnesh')).toContainText('Face from photo');
    await expect(page.getByTestId('sd-face-open-Ratnesh')).toHaveText(/^Face$/);
});

test('the manager can switch to the back camera (phone pointed at the person) and still register the face', async ({ page }) => {
    await openFace(page, 'Ratnesh');
    await page.getByTestId('face-take').click();
    await expect.poll(() => page.getByTestId('face-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await expect(page.getByTestId('face-switch')).toHaveText(/Back camera/);
    await page.getByTestId('face-switch').click();
    await expect(page.getByTestId('face-switch')).toHaveText(/Front camera/);
    await expect.poll(() => page.getByTestId('face-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await expect(page.getByTestId('face-video')).not.toHaveClass(/-scale-x-100/);   // the back camera is not mirrored
    await who(page, 'V');
    await page.getByTestId('face-scan').click();
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('sd-face-Ratnesh')).toContainText('Face from photo');
});

test('a face registered to someone who has left does not block the same face on another name', async ({ page }) => {
    await seedFace(page, 'Karan', B);   // Karan's face ...
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-left-Karan').click();
    await page.getByTestId('sd-left-confirm').click();   // ... Karan leaves
    await who(page, 'B');
    await page.getByTestId('sd-face-open-Bhawna').click();   // the same face, now for Bhawna: allowed
    await takeFace(page);
    await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('face-save').click();
    await expect(page.getByTestId('face-dialog')).toHaveCount(0);
    expect(await terminalScan(page, 'in')).toBe('Bhawna');
});

test('every staff member with no face can be registered one after the other, whatever the faces look like - and the terminal never guesses between look-alikes', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'workforce');
    // several people have no face yet; one is very close to someone already registered
    await seedFace(page, 'Varun', 0.01);
    const faces = { Ratnesh: 0.012, Karan: 0.4, 'Amar Singh': 0.55, Bhawna: 0.8 };   // Ratnesh ~ Varun (0.02 away)
    for (const [name, v] of Object.entries(faces)) {
        await showFace(page, v);
        await page.getByTestId(`sd-face-open-${name}`).click();
        await expect(page.getByTestId('face-dialog')).toBeVisible();
        await takeFace(page);
        await expect(page.getByTestId('face-new')).toBeVisible({ timeout: 15000 });
        await expect(page.getByTestId('face-dialog')).not.toContainText(/already registered|looks a little like|Reset first/);
        await page.getByTestId('face-save').click();
        await expect(page.getByTestId('face-dialog')).toHaveCount(0);
        await expect(page.getByTestId(`sd-face-${name}`)).toContainText('Face from photo');
    }
    // the terminal recognises the clear ones
    for (const [name, v] of Object.entries({ Karan: 0.4, 'Amar Singh': 0.55, Bhawna: 0.8 })) {
        await showFace(page, v);
        expect(await terminalScan(page, 'in'), name).toBe(name);
        await page.getByRole('button', { name: 'Done' }).click();
    }
    // two look-alikes (Varun 0.01 and Ratnesh 0.012): not guessed - asks for a better photo, nothing saved
    await showFace(page, 0.011);
    expect(await terminalScan(page, 'in')).toBe(null);
    await expect(page.getByTestId('att-error')).toContainText('Come closer');
});
