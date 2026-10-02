import { expect } from '@playwright/test';

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

export async function openAdmin(page) {
    await page.goto('/');
    // Two "Admin" entry points (desktop menu + bottom tab, hidden >=1024px); click whichever is visible
    await page.getByText('Admin', { exact: true }).filter({ visible: true }).first().click();
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
