import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin } from './helpers';
import { rooms } from '../../02_Application_Source/data/rooms';

// A brand-new hotel day: every room clean, no guests, orders, logs, staff or attendance.
// Every screen must render cleanly - no NaN / undefined / Infinity / negative money, no crash.
test.skip(({ isMobile }) => isMobile, 'desktop admin');

const project = `demo-empty-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const base = `http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents`;
const owner = { Authorization: 'Bearer owner' };
const v = (x) => (Array.isArray(x) ? { arrayValue: { values: x.map(v) } }
    : typeof x === 'number' ? { integerValue: String(x) } : typeof x === 'string' ? { stringValue: x }
        : typeof x === 'boolean' ? { booleanValue: x } : x === null ? { nullValue: null }
            : { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } });
const put = (request, path, data) => request.patch(`${base}/${path}`, { headers: owner, data: { fields: Object.fromEntries(Object.entries(data).map(([k, x]) => [k, v(x)])) } });

test.beforeAll(async ({ request }) => {
    for (const col of ['hotel_rooms', 'hotel_orders', 'hotel_settlements', 'hotel_cleaning_logs', 'hotel_checkout_logs', 'hotel_laundry_logs', 'hotel_attendance']) {
        expect((await put(request, `hotel_meta/${col}`, { seededAt: 1 })).ok()).toBe(true);
    }
    for (const [i, r] of rooms.entries()) {
        // eslint-disable-next-line no-unused-vars
        const { guest, ...clean } = r;
        expect((await put(request, `hotel_rooms/${r.id}`, { ...clean, status: 'Clean', _order: i })).ok()).toBe(true);
    }
    await put(request, 'hotel_state/staffRegistry', { value: { reception: [], kitchen: [], housekeeping: [] } });
    await put(request, 'hotel_state/menuOverrides', { value: {} });
});

test('every OPS Center tab renders an empty hotel without NaN / undefined / errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript(p => localStorage.setItem('sky5_emu_project', p), project);
    await stubWindowOpen(page);
    await openAdmin(page);
    await expect(page.getByTestId('admin-live')).toHaveText('● Live', { timeout: 15000 });
    await expect(page.getByTestId('stat-occupied')).toContainText('0');
    const bad = /\bNaN\b|undefined|Infinity|₹-|null\b/;
    for (const t of ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu-config']) {
        await page.getByTestId(`nav-${t}`).click();
        await page.waitForTimeout(300);
        if (!(await page.locator('main').count())) throw new Error(`${t}: screen crashed. ${errors.join(' | ')}`);
        const text = await page.locator('main').innerText();
        expect(text, `${t} shows a broken value`).not.toMatch(bad);
    }
    // the Today numbers of an empty hotel
    await page.getByTestId('nav-today').click();
    await expect(page.getByTestId('today-kpi-occupancy-value')).toHaveText('0%');
    await expect(page.getByTestId('today-kpi-due-value')).toHaveText('₹0');
    await expect(page.getByTestId('today-kpi-staff-value')).toHaveText('0');
    // share / export buttons on empty lists must not crash or send "undefined"
    await page.getByTestId('nav-attendance').click();
    await page.getByRole('button', { name: '💬 SHARE', exact: true }).click();
    const wa = (await page.evaluate(() => window.__opened)).filter(u => String(u).startsWith('https://wa.me/')).pop();
    const msg = decodeURIComponent(wa.split('text=')[1]);
    expect(msg).not.toMatch(bad);
    expect(msg).toContain('No attendance marked yet today.');
    expect(errors).toEqual([]);
});
