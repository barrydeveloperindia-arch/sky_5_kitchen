import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, waitSaved, fakeFaces, showFace, seedFace, scan } from './helpers';

// Staff PINs (the same 4 digits as in TimeStation): set by the manager in Workforce, and the way to check in / out
// on the terminal when the face is not recognised. A first PIN check-in with a clear photo registers the face.
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
const toTerminal = async (page) => { await page.goto('/attendance'); await expect(page.getByTestId('att-in')).toBeEnabled(); };

const STRANGER = 0.9;
// the face is not recognised -> the failure card
async function notRecognised(page, kind = 'in') {
    await showFace(page, STRANGER);
    await scan(page, kind);
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');
    await expect(page.getByTestId('att-face-failed')).toContainText('Face not recognised');
}

test('face not recognised: Use PIN, choose the name - a wrong PIN is refused, the right PIN saves the entry (marked PIN)', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await toTerminal(page);
    await notRecognised(page, 'in');
    await page.getByTestId('att-use-pin').click();
    await expect(page.getByTestId('att-pin-pick')).toBeVisible();
    await expect(page.getByTestId('att-pin-name-Bhawna')).toBeDisabled();   // no PIN set: cannot be chosen
    await expect(page.getByTestId('att-pin-name-Bhawna')).toContainText('No PIN yet');
    await page.getByTestId('att-pin-name-Pin Person').click();
    await expect(page.getByTestId('pin-badge')).toHaveText(/Check in with PIN/i);
    await typePin(page, '1111');
    await expect(page.getByTestId('pin-error')).toContainText('Wrong PIN');
    await typePin(page, '4321');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-name')).toHaveText('Pin Person');
    await expect(page.getByTestId('att-face')).toContainText('Checked with your PIN');

    const rows = (await readAll(page, 'hotel_attendance')).filter(r => r.f.staffName?.stringValue === 'Pin Person');
    expect(rows).toHaveLength(1);
    expect(rows[0].f.inFace.mapValue.fields.check.stringValue).toBe('pin');
    await page.getByRole('button', { name: 'Done' }).click();
    await openAdmin(page);
    await adminTab(page, 'attendance');
    await expect(page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Pin Person' })).toContainText('· PIN');
});

test('no face registered yet: the first PIN check-in with a clear photo registers the face - the next scan recognises them', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await toTerminal(page);
    await notRecognised(page, 'in');   // this face is in fact Pin Person, not registered yet
    await page.getByTestId('att-use-pin').click();
    await page.getByTestId('att-pin-name-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-face')).toContainText('face registered', { timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();
    const faces = (await readAll(page, 'hotel_staff_faces')).filter(r => r.f.staffName?.stringValue === 'Pin Person');
    expect(faces).toHaveLength(1);
    // three minutes later the face alone is enough
    await page.clock.fastForward('03:00');
    await scan(page, 'out');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-name')).toHaveText('Pin Person');
    await expect(page.getByTestId('att-face')).toContainText('Face verified');
});

test('a PIN never registers a face that already belongs to someone else', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await toTerminal(page);
    await seedFace(page, 'Varun', 0.5);
    await showFace(page, 0.52);   // nearly Varun's face, a clear photo - but not close enough to be sure
    await seedFace(page, 'Karan', 0.54);
    await scan(page, 'in');       // two people this close: not guessed
    await expect(page.getByTestId('att-error')).toContainText(/come closer/i);
    await page.getByTestId('att-cancel').click();
    await page.getByTestId('att-pin-link').click();
    await page.getByTestId('att-pin-name-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-face')).toContainText('Checked with your PIN', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).not.toContainText('face registered');
    expect((await readAll(page, 'hotel_staff_faces')).filter(r => r.f.staffName?.stringValue === 'Pin Person')).toHaveLength(0);
});

test('Change PIN needs the current PIN; the new PIN works on the terminal and the old one no longer does', async ({ page }) => {
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
    await toTerminal(page);
    await page.getByTestId('att-pin-link').click();
    await page.getByTestId('att-pin-name-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('pin-error')).toContainText('Wrong PIN');
    await typePin(page, '2468');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    // the PIN itself is nowhere in the saved data (only a hash, in a place no device can read)
    const reg = JSON.stringify(await readAll(page, 'hotel_state'));
    expect(reg).not.toContain('2468');
    expect(reg).toContain('pinSet');
});

test('the PIN link works without the camera; In / Out can be chosen; 5 wrong PINs lock it for a minute', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await toTerminal(page);
    await page.getByTestId('att-pin-link').click();
    await page.getByTestId('att-pin-name-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-live')).toBeVisible();   // no photo: the PIN sign instead
    await page.getByRole('button', { name: 'Done' }).click();
    await page.clock.fastForward('03:00');
    await page.getByTestId('att-pin-link').click();
    await page.getByTestId('att-pin-kind-out').click();
    await expect(page.getByTestId('att-pin-kind-out')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('att-pin-name-Pin Person').click();
    await expect(page.getByTestId('pin-badge')).toHaveText(/Check out with PIN/i);
    await expect(page.getByTestId('att-video')).toHaveCount(0);
    await page.waitForTimeout(400);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`), 'PIN pad').toEqual([]);
    for (let i = 0; i < 4; i++) { await typePin(page, '0000'); await expect(page.getByTestId('pin-error')).toContainText(`${4 - i} ${4 - i === 1 ? 'try' : 'tries'} left`); }
    await typePin(page, '0000');
    await expect(page.getByTestId('pin-locked')).toContainText('Locked');
    await expect(page.getByTestId('pin-1')).toBeDisabled();
    await page.clock.fastForward('01:05');
    await expect(page.getByTestId('pin-1')).toBeEnabled();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
});

test('the name list for the PIN: readable (WCAG AA) and searchable', async ({ page }) => {
    await page.getByTestId('att-pin-link').click();
    await expect(page.getByTestId('att-pin-pick')).toBeVisible();
    await page.waitForTimeout(400);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    await page.getByTestId('att-search').fill('bhaw');
    await expect(page.getByTestId('att-pin-name-Bhawna')).toBeVisible();
    await expect(page.getByTestId('att-pin-name-Varun')).toHaveCount(0);
});

test('phone turned sideways (740x360): the name list and the PIN pad stay inside the screen and can be scrolled to every key', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    await page.setViewportSize({ width: 740, height: 360 });
    await toTerminal(page);
    await page.getByTestId('att-pin-link').click();
    const pick = page.getByTestId('att-pin-pick');
    await expect(pick).toBeVisible();
    await page.waitForTimeout(500);
    let box = await pick.boundingBox();
    expect(box.y, 'name list top on screen').toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height, 'name list bottom on screen').toBeLessThanOrEqual(361);
    await page.getByTestId('att-pin-name-Pin Person').scrollIntoViewIfNeeded();
    await page.getByTestId('att-pin-name-Pin Person').click();
    const pad = page.getByTestId('pin-dialog');
    await expect(pad).toBeVisible();
    await page.waitForTimeout(500);
    box = await pad.boundingBox();
    expect(box.y, 'PIN pad top on screen').toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height, 'PIN pad bottom on screen').toBeLessThanOrEqual(361);
    for (const d of '4321') { await page.getByTestId(`pin-${d}`).scrollIntoViewIfNeeded(); await page.getByTestId(`pin-${d}`).click(); }
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
});

test('a registered face that looks different today: after one PIN entry the face is learned and the next scan recognises the person; a stranger with that PIN teaches nothing', async ({ page }) => {
    await personWithPin(page, 'Pin Person', '4321');
    const staffId = (await page.getByTestId('sd-row-Pin Person').innerText()).match(/SKY5-\d{3}/)[0];
    await seedFace(page, 'Pin Person', 0.30, staffId);   // registered some time ago
    await toTerminal(page);
    // today the same person looks a bit different (0.68 away: not recognised)
    await showFace(page, 0.36);
    await scan(page, 'in');
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');
    await expect(page.getByTestId('att-face-failed')).toBeVisible();
    await page.getByTestId('att-use-pin').click();
    await page.getByTestId('att-pin-name-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-face')).toContainText('face updated', { timeout: 15000 });
    await page.getByRole('button', { name: 'Done' }).click();
    const rec = (await readAll(page, 'hotel_staff_faces')).find(r => r.id === staffId);
    expect(rec.f.samples.arrayValue.values).toHaveLength(1);

    // next time: the face alone is enough
    await page.clock.fastForward('03:00');
    await scan(page, 'out');
    await expect(page.getByTestId('att-done')).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-name')).toHaveText('Pin Person');
    await expect(page.getByTestId('att-face')).toContainText('Face verified');
    await page.getByRole('button', { name: 'Done' }).click();

    // someone else who knows the PIN: the entry is saved (PIN), but their face is NOT added to Pin Person
    await page.clock.fastForward('03:00');
    await showFace(page, 0.9);
    await scan(page, 'in');
    await expect(page.getByTestId('att-face-failed')).toBeVisible();
    await page.getByTestId('att-use-pin').click();
    await page.getByTestId('att-pin-name-Pin Person').click();
    await typePin(page, '4321');
    await expect(page.getByTestId('att-face')).toContainText('Checked with your PIN', { timeout: 15000 });
    await expect(page.getByTestId('att-face')).not.toContainText('face updated');
    const rec2 = (await readAll(page, 'hotel_staff_faces')).find(r => r.id === staffId);
    expect(rec2.f.samples.arrayValue.values).toHaveLength(1);
});
