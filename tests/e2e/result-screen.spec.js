import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, stubWindowOpen, openAdmin, fakeFaces, showFace, seedFace, cameraUp } from './helpers';

// The screen after a scan, like an office face terminal: a clear status band, the registered photo next to the
// live photo, name / ID / time / how it was verified / where, today's in-out-hours, a tone and a spoken line.
test.skip(({ isMobile }) => isMobile, 'flows, once is enough');
test.use({
    viewport: { width: 412, height: 915 },
    launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
    permissions: ['camera', 'geolocation'],
    geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 },
});

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await fakeFaces(page);
    await page.addInitScript(() => {
        window.__said = [];
        window.speechSynthesis.speak = (u) => window.__said.push(u.text);
        window.speechSynthesis.cancel = () => {};
    });
    await page.clock.install();
    await expect(async () => {
        await openAdmin(page);
        await page.waitForTimeout(1500);
        await page.goto('/attendance');
        await expect(page.getByTestId('att-in')).toBeEnabled({ timeout: 3000 });
    }).toPass({ timeout: 20000 });
    await seedFace(page, 'Varun', 0.01);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

const scan = async (page, kind = 'in') => {
    await page.getByTestId(`att-${kind}`).click();
    await cameraUp(page);
};

test('check in, then check out: status band, live photo, name, details, today, tone and voice', async ({ page }) => {
    await scan(page);
    const done = page.getByTestId('att-done');
    await expect(done).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-banner')).toContainText('Attendance marked');
    await expect(page.getByTestId('att-done-name')).toHaveText('Varun');
    await expect(page.getByTestId('att-face')).toContainText('Face verified');
    await expect(page.getByTestId('att-place')).toContainText('At Hotel Sky 5');
    await expect(page.getByTestId('att-done-live')).toBeVisible();
    await expect(page.getByTestId('att-done-today')).toContainText(await page.getByTestId('att-done-time').innerText());
    // the screen is filled: Done sits near the bottom, nothing below needs scrolling
    const btn = await page.getByRole('button', { name: 'Done' }).boundingBox();
    expect(btn.y + btn.height).toBeGreaterThan(915 * 0.75);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(1);
    await page.waitForTimeout(600);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.map(v => `${v.id}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    await page.getByRole('button', { name: 'Done' }).click();

    await page.clock.fastForward('03:00');
    await scan(page, 'out');
    await expect(done).toContainText('Check Out Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-worked')).toContainText('In ');
    await expect(page.getByTestId('att-done-today')).not.toContainText('Out--');
    await expect.poll(() => page.evaluate(() => window.__said)).toEqual(expect.arrayContaining([
        expect.stringMatching(/Check in successful/), expect.stringMatching(/Check out successful/)]));
});

test('with a staff photo, the registered photo is shown beside the live one', async ({ page }) => {
    // the manager's staff photo of Varun (the face record points to it via the person's photo)
    const project = await page.evaluate(() => localStorage.getItem('sky5_emu_project'));
    const url = (p) => `http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents/${p}`;
    const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
    expect((await page.request.patch(url('hotel_attendance_photos/ref-varun'), { headers: { Authorization: 'Bearer owner' },
        data: { fields: { logId: { stringValue: 'x' }, kind: { stringValue: 'in' }, staffName: { stringValue: 'Varun' }, at: { stringValue: new Date().toISOString() }, data: { stringValue: jpeg } } } })).ok()).toBe(true);
    const face = await (await page.request.get(url('hotel_staff_faces/name-varun'), { headers: { Authorization: 'Bearer owner' } })).json();
    face.fields.photoId = { stringValue: 'ref-varun' };
    face.fields.source = { stringValue: 'first-check-in' };
    expect((await page.request.patch(url('hotel_staff_faces/name-varun'), { headers: { Authorization: 'Bearer owner' }, data: { fields: face.fields } })).ok()).toBe(true);
    await scan(page);
    await expect(page.getByTestId('att-done')).toContainText('Check In Successful', { timeout: 15000 });
    await expect(page.getByTestId('att-done-ref')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('att-done-live')).toBeVisible();
});

test('a face nobody registered: the screen says so and the phone says "Face not recognised"', async ({ page }) => {
    await showFace(page, 0.9);
    await scan(page);
    await expect(page.getByTestId('att-error')).toContainText('Face not recognised');
    await expect(page.getByTestId('att-face-failed')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__said)).toEqual(expect.arrayContaining(['Face not recognised. Please try again.']));
    await expect(page.getByTestId('att-done')).toHaveCount(0);
});
