import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, waitSaved } from './helpers';

// Staff PINs (the same 4 digits as in TimeStation): set by the manager, asked before Edit / Re-scan / Delete
// on the staff page, and a way to check in / out when the face does not work.
test.skip(({ isMobile }) => isMobile, 'flows, once is enough');
test.use({
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
});

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await page.addInitScript(() => {
        const face = (v) => ({ descriptor: Array.from({ length: 128 }, () => v), score: 0.95, width: 400 });
        window.__FACE_TEST__ = { findFaces: () => { const m = localStorage.getItem('faceTest'); return m === 'none' ? [] : [face(m === 'other' ? 0.5 : 0.01)]; } };
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

const typePin = async (page, pin) => { for (const d of pin) await page.getByTestId(`pin-${d}`).click(); };
const projectOf = (page) => page.evaluate(() => localStorage.getItem('sky5_emu_project'));
async function readAll(page, coll) {
    const r = await page.request.get(`http://127.0.0.1:8181/v1/projects/${await projectOf(page)}/databases/(default)/documents/${coll}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } });
    return ((await r.json()).documents || []).map(d => ({ id: d.name.split('/').pop(), f: d.fields }));
}

// A person with a staff ID (needed for a PIN), PIN set by the manager in Staff Directory
async function personWithPin(page, name, pin) {
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-add').click();
    const form = page.getByTestId('staff-form');
    await form.getByLabel('Full name (as on Aadhaar)', { exact: true }).fill(name);
    await form.getByLabel('Post', { exact: true }).fill('Helper');
    await page.getByTestId('sf-save').click();
    await page.getByTestId(`sd-pin-${name}`).click();
    await expect(page.getByTestId('pin-dialog')).toContainText(`New PIN for ${name}`);
    await typePin(page, pin);
    await expect(page.getByTestId('pin-dialog')).toContainText('Type the new PIN again');
    await typePin(page, pin);
    await expect(page.getByTestId('pin-dialog')).toHaveCount(0);
    await expect(page.getByTestId(`sd-pin-${name}`)).toHaveText(/Change PIN/);
    await waitSaved(page);
}
const camTap = async (page) => {
    await page.getByTestId('att-tap').click();
    await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
    await page.getByTestId('att-capture').click();
};

test('face does not match: "check out with your PIN" - a wrong PIN is refused, the right PIN saves the tap (marked PIN)', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await page.goto('/attendance');
    await page.getByTestId('att-pick-Pin Person').click();
    await camTap(page);   // first check-in registers the face
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();

    await page.evaluate(() => localStorage.setItem('faceTest', 'other'));   // e.g. bad light: the face does not match
    await page.clock.fastForward('03:00');
    await expect(page.getByTestId('att-tap')).toHaveText(/CHECK OUT/, { timeout: 20000 });
    await camTap(page);
    await expect(page.getByTestId('att-error')).toContainText('does not match');
    await page.getByTestId('att-use-pin').click();
    await typePin(page, '1111');
    await expect(page.getByTestId('pin-error')).toContainText('Wrong PIN');
    await typePin(page, '4321');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).toContainText('Checked with your PIN');

    const rows = (await readAll(page, 'hotel_attendance')).filter(r => r.f.staffName?.stringValue === 'Pin Person');
    expect(rows).toHaveLength(1);
    expect(rows[0].f.outFace.mapValue.fields.check.stringValue).toBe('pin');
    expect(rows[0].f.checkOut.stringValue).not.toBe('--');
    await page.getByRole('button', { name: 'Done' }).click();
    await openAdmin(page);
    await adminTab(page, 'attendance');
    await expect(page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Pin Person' })).toContainText('· PIN');
});

test('Edit details, the pencil on the list, Re-scan face and Delete all ask the PIN first', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await page.goto('/attendance');
    // the pencil on the list
    await page.getByTestId('att-edit-Pin Person').click();
    await expect(page.getByTestId('pin-dialog')).toContainText('Pin Person');
    await expect(page.getByTestId('pin-badge')).toHaveText(/Edit details/i);
    await typePin(page, '9999');
    await expect(page.getByTestId('pin-error')).toContainText('Wrong PIN');
    await expect(page.getByTestId('staff-form')).toHaveCount(0);
    await typePin(page, '4321');
    await expect(page.getByTestId('staff-form')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    // after choosing the name
    await page.getByTestId('att-pick-Pin Person').click();
    await page.getByTestId('att-rescan').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('face-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    page.once('dialog', d => d.accept());
    await page.getByTestId('att-delete').click();
    await expect(page.getByTestId('pin-dialog')).toBeVisible();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-pick-Pin Person')).toHaveCount(0);   // deleted (= left)
    // people without a PIN go straight on (no PIN pad)
    await page.getByTestId('att-edit-Bhawna').click();
    await expect(page.getByTestId('staff-form')).toBeVisible();
    await expect(page.getByTestId('pin-dialog')).toHaveCount(0);
});

test('Change PIN needs the current PIN; the new PIN works and the old one no longer does', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await page.getByTestId('sd-pin-Pin Person').click();
    await expect(page.getByTestId('pin-dialog')).toContainText('Current PIN of Pin Person');
    await typePin(page, '0000');
    await expect(page.getByTestId('pin-error')).toContainText('Wrong current PIN');
    await typePin(page, '4321');
    await expect(page.getByTestId('pin-dialog')).toContainText('New PIN');
    await typePin(page, '2468');
    await typePin(page, '2469');   // typo
    await expect(page.getByTestId('pin-error')).toContainText('Not the same');
    await typePin(page, '2468');
    await expect(page.getByTestId('pin-dialog')).toHaveCount(0);
    // on the staff page: the old PIN fails, the new one works
    await page.goto('/attendance');
    await page.getByTestId('att-edit-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('pin-error')).toContainText('Wrong PIN');
    await typePin(page, '2468');
    await expect(page.getByTestId('staff-form')).toBeVisible();
    // the PIN itself is nowhere in the saved data (only a hash, in a place no device can read)
    const reg = JSON.stringify(await readAll(page, 'hotel_state'));
    expect(reg).not.toContain('2468');
    expect(reg).toContain('pinSet');
});

test('the PIN link on the panel checks in without the camera; the failure card offers Try again / Use PIN; 5 wrong PINs lock it', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await page.goto('/attendance');
    await page.getByTestId('att-pick-Pin Person').click();
    // the face fails -> a clear card with two ways on
    await page.evaluate(() => localStorage.setItem('faceTest', 'none'));
    for (let i = 0; i < 5; i++) {
        if (i === 0) await page.getByTestId('att-tap').click();
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        if (i < 4) await expect(page.getByTestId('att-countdown')).toBeVisible({ timeout: 10000 });
    }
    await expect(page.getByTestId('att-face-failed')).toContainText('Face not recognised');
    await expect(page.getByTestId('att-try-again')).toBeVisible();
    await expect(page.getByTestId('att-use-pin')).toBeVisible();
    const a11y = async () => (await page.waitForTimeout(400), await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations.map(v => `${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`);
    expect(await a11y(), 'failure card').toEqual([]);
    // 5 wrong PINs: locked for a minute
    await page.getByTestId('att-use-pin').click();
    await expect(page.getByTestId('pin-badge')).toHaveText(/Check in with PIN/i);
    expect(await a11y(), 'PIN pad').toEqual([]);
    for (let i = 0; i < 4; i++) { await typePin(page, '0000'); await expect(page.getByTestId('pin-error')).toContainText(`${4 - i} ${4 - i === 1 ? 'try' : 'tries'} left`); }
    await typePin(page, '0000');
    await expect(page.getByTestId('pin-locked')).toContainText('Locked');
    await expect(page.getByTestId('pin-1')).toBeDisabled();
    await page.clock.fastForward('01:05');
    await expect(page.getByTestId('pin-1')).toBeEnabled();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).toContainText('Checked with your PIN');
    await page.getByRole('button', { name: 'Done' }).click();
    // later: the small link under the buttons, straight to the PIN (no camera)
    await page.clock.fastForward('03:00');
    await expect(page.getByTestId('att-pin-link')).toContainText('Check out with PIN', { timeout: 20000 });
    await page.getByTestId('att-pin-link').click();
    await expect(page.getByTestId('att-video')).toHaveCount(0);
    await typePin(page, '4321');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
});

test('someone without a PIN sees no PIN link, and the failure card says the manager sets the PIN', async ({ page }) => {
    await page.getByTestId('att-pick-Bhawna').click();
    await expect(page.getByTestId('att-tap')).toBeVisible();
    await expect(page.getByTestId('att-pin-link')).toHaveCount(0);
    await page.evaluate(() => localStorage.setItem('faceTest', 'none'));
    await page.getByTestId('att-tap').click();
    for (let i = 0; i < 5; i++) {
        await expect.poll(() => page.getByTestId('att-video').evaluate(v => v.videoWidth)).toBeGreaterThan(0);
        await page.getByTestId('att-capture').click();
        if (i < 4) await expect(page.getByTestId('att-countdown')).toBeVisible({ timeout: 10000 });
    }
    await expect(page.getByTestId('att-no-pin')).toContainText('manager sets it');
    await expect(page.getByTestId('att-use-pin')).toHaveCount(0);
});
