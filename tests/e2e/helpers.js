import { expect } from '@playwright/test';
import { readFileSync } from 'fs';

// Collect page errors / console errors so every test can assert a clean run.
export function trackErrors(page) {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
        if (m.type() !== 'error') return;
        const text = m.text();
        // External QR/avatar images may be blocked offline; not an app bug.
        if (/Failed to load resource/.test(text)) return;
        // Firestore SDK notice when a page is closed/reloaded mid-connection (not an app error)
        if (/Could not reach Cloud Firestore backend/.test(text)) return;
        // the test dev server's hot-reload socket closing at the end of a run (dev server only, not the app)
        if (/WebSocket connection to 'ws:\/\/localhost:\d+\/\?token=/.test(text)) return;
        errors.push(`console: ${text}`);
    });
    return errors;
}

// Print / WhatsApp buttons call window.open and window.print; record instead of opening.
export async function stubWindowOpen(page) {
    await page.addInitScript(() => {
        window.__opened = [];
        window.open = (url) => {
            window.__opened.push(url || '');
            if (url) return { closed: false }; // a real browser returns the new tab
            // print windows: give back a writable fake document
            return { document: { write: (h) => window.__opened.push(h), close() {} }, focus() {}, print() {} };
        };
        window.print = () => { window.__printed = (window.__printed || 0) + 1; };
    });
}

// OPS Center needs the admin login. Tests make the admin user in the auth emulator with a test-only password
// (never the hotel's real one) and log in through the screen.
export const ADMIN_EMAIL = 'admin@sky5.com';
export const TEST_ADMIN_PASSWORD = 'test-admin-pass';
export async function createTestAdmin(page) {
    // the app signs in with the public web API key, so the test user is made the same way (same emulator project)
    const key = JSON.parse(readFileSync(new URL('../../02_Application_Source/lib/firebaseConfig.json', import.meta.url))).apiKey;
    const r = await page.request.post(`http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
        { data: { email: ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD, returnSecureToken: true } });
    if (!r.ok() && !(await r.text()).includes('EMAIL_EXISTS')) throw new Error(`test admin: ${r.status()} ${await r.text()}`);
}
// After a click on "Admin": log in if the login screen is shown
export async function unlockAdmin(page) {
    const gate = page.getByTestId('admin-gate');
    await expect(page.getByTestId('admin-checking')).toHaveCount(0, { timeout: 15000 });   // the saved login has been read
    await expect(gate.or(page.getByRole('heading', { level: 1 })).first()).toBeVisible();
    if (!(await gate.isVisible())) return;
    await createTestAdmin(page);
    await page.getByTestId('admin-email').fill(ADMIN_EMAIL);
    await page.getByTestId('admin-password').fill(TEST_ADMIN_PASSWORD);
    await page.getByTestId('admin-login').click();
    await expect(gate).toHaveCount(0, { timeout: 15000 });
}
export async function openAdmin(page) {
    await page.goto('/');
    // Two "Admin" entry points (desktop menu + bottom tab, hidden >=1024px); click whichever is visible
    await page.getByText('Admin', { exact: true }).filter({ visible: true }).first().click();
    await unlockAdmin(page);
    // OPS Center opens on the "Today" dashboard; most tests start from Reception
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
    await page.getByTestId('nav-reception').click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Reception');
}

export async function adminTab(page, key) {
    await page.getByTestId(`nav-${key}`).click();
}

// Wait until every change on this page has reached the database ("● Live" in the header)
export async function waitSaved(page) {
    await expect(page.getByTestId('admin-live')).toHaveText('● Live', { timeout: 15000 });
}

// ---- staff attendance terminal (the face says who it is) ----
// The fake camera shows one face: localStorage "faceVal" = a number (each person gets their own number), or "none".
// Faces are compared by distance; numbers 0.1 apart are clearly different people.
export async function fakeFaces(page) {
    await page.addInitScript(() => {
        const face = (v) => ({ descriptor: Array.from({ length: 128 }, () => v), score: 0.95, width: 400 });
        window.__FACE_TEST__ = { findFaces: () => { const m = localStorage.getItem('faceVal'); return m === 'none' ? [] : [face(m == null ? 0.01 : Number(m))]; } };
        // timing of every camera start (to see a slow fake camera under load)
        window.__gum = [];
        const md = navigator.mediaDevices, orig = md.getUserMedia.bind(md);
        md.getUserMedia = (c) => { const t = performance.now(); const e = { start: Math.round(t) }; window.__gum.push(e); return orig(c).then(s => { e.ms = Math.round(performance.now() - t); return s; }, err => { e.err = String(err); throw err; }); };
    });
}
export const showFace = (page, v) => page.evaluate((x) => localStorage.setItem('faceVal', String(x)), v);
const faceKeyOf = (name, staffId) => (staffId || `name-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
// Register a face for a person straight in the (emulator) database, as the manager would in Workforce -> Face
export async function seedFace(page, name, v, staffId = '') {
    const project = await page.evaluate(() => localStorage.getItem('sky5_emu_project'));
    const fields = {
        staffName: { stringValue: name }, staffId: { stringValue: staffId }, source: { stringValue: 'staff-photo' }, photoId: { stringValue: '' },
        at: { stringValue: new Date().toISOString() }, reset: { booleanValue: false },
        descriptor: { arrayValue: { values: Array.from({ length: 128 }, () => ({ doubleValue: v })) } },
    };
    const r = await page.request.patch(`http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents/hotel_staff_faces/${faceKeyOf(name, staffId)}`,
        { headers: { Authorization: 'Bearer owner' }, data: { fields } });
    if (!r.ok()) throw new Error(`seedFace ${name}: ${r.status()}`);
}
// Press CHECK IN / CHECK OUT, wait for the camera, scan now
export async function scan(page, kind = 'in') {
    await page.getByTestId(`att-${kind}`).click();
    await cameraUp(page);
}

// The camera is up - or the scan already finished (it is fast): result / note / failure card on screen
export async function cameraUp(page) {
    await expect.poll(async () => {
        for (const id of ['att-done', 'att-notice', 'att-face-failed', 'att-saving']) if (await page.getByTestId(id).count()) return true;
        return (await page.getByTestId('att-video').evaluate(v => v.videoWidth, null, { timeout: 300 }).catch(() => 0)) > 0;
    }, { message: `camera / result did not come up; camera starts: ${await page.evaluate(() => JSON.stringify(window.__gum || [])).catch(() => '?')}` }).toBe(true);
}
