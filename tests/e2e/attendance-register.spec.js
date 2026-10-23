import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';

// OPS Center -> Attendance register: newest first, a missed check-out is shown as such (not as "still in"),
// a night shift says "next day", worked hours are shown, shifts are written one clean way.
test.skip(({ isMobile }) => isMobile, 'manager screen');

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const key = (d) => `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}`;
const v = (x) => (x === null ? { nullValue: null } : typeof x === 'number' ? { doubleValue: x } : typeof x === 'boolean' ? { booleanValue: x } : { stringValue: x });
async function putRow(page, id, row) {
    const project = await page.evaluate(() => localStorage.getItem('sky5_emu_project'));
    const r = await page.request.patch(`http://127.0.0.1:8181/v1/projects/${project}/databases/(default)/documents/hotel_attendance/${id}`,
        { headers: { Authorization: 'Bearer owner' }, data: { fields: Object.fromEntries(Object.entries({ id, ...row }).map(([k, x]) => [k, v(x)])) } });
    expect(r.ok()).toBe(true);
}

test('newest first; old open row = "No check-out" (no button); night shift = "next day"; hours shown; clean shift text', async ({ page }) => {
    await openAdmin(page);
    const now = new Date();
    const d3 = new Date(now); d3.setDate(now.getDate() - 3); d3.setHours(9, 0, 0, 0);
    const d2 = new Date(now); d2.setDate(now.getDate() - 2); d2.setHours(19, 5, 0, 0);
    const d2out = new Date(d2); d2out.setDate(d2.getDate() + 1); d2out.setHours(10, 25, 0, 0);
    const today = new Date(now); today.setHours(Math.max(0, now.getHours() - 1), 0, 0, 0);
    const base = { status: 'Present', source: 'staff-web' };
    await putRow(page, 'r-old-open', { ...base, staffName: 'Varun', date: key(d3), dateISO: iso(d3), checkIn: '09:00 AM', checkOut: '--', inAt: d3.toISOString() });
    await putRow(page, 'r-night', { ...base, staffName: 'Bhawna', date: key(d2), dateISO: iso(d2), checkIn: '07:05 PM', checkOut: '10:25 AM', inAt: d2.toISOString(), outAt: d2out.toISOString(), hours: (d2out - d2) / 3600000 });
    await putRow(page, 'r-today', { ...base, staffName: 'Karan', date: key(today), dateISO: iso(today), checkIn: today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), checkOut: '--', inAt: today.toISOString() });

    await adminTab(page, 'attendance');
    await page.getByTestId('att-scope-all').click();
    const ledger = page.getByTestId('att-register');
    await expect(ledger.getByRole('row').filter({ hasText: 'Karan' }).filter({ hasText: key(today) })).toHaveCount(1, { timeout: 15000 });
    // newest first
    const order = await ledger.locator('tbody tr').evaluateAll(rows => rows.map(r => r.textContent));
    const pos = (name, d) => order.findIndex(t => t.includes(name) && t.includes(d));
    expect(pos('Karan', key(today))).toBeLessThan(pos('Bhawna', key(d2)));
    expect(pos('Bhawna', key(d2))).toBeLessThan(pos('Varun', key(d3)));
    // the May sample rows (when the test database has them) are the oldest
    if (pos('Karan', '06-May') >= 0) expect(pos('Varun', key(d3))).toBeLessThan(pos('Karan', '06-May'));
    // the old open row: "No check-out", no CHECK-OUT button; today's open row keeps the button
    const old = ledger.getByRole('row').filter({ hasText: 'Varun' }).filter({ hasText: key(d3) });
    await expect(old.getByTestId('att-missed-out-r-old-open')).toHaveText('No check-out');
    await expect(old.getByRole('button', { name: 'CHECK-OUT', exact: true })).toHaveCount(0);
    await expect(ledger.getByRole('row').filter({ hasText: 'Karan' }).filter({ hasText: key(today) })).not.toContainText('No check-out');   // today: still at work
    // night shift: out the next day, hours over midnight
    const night = ledger.getByRole('row').filter({ hasText: 'Bhawna' }).filter({ hasText: key(d2) });
    await expect(night).toContainText('next day');
    await expect(night.getByTestId('att-hours-r-night')).toHaveText('15h 20m');
    // shifts in one clean format (or Flexible)
    for (const t of await ledger.locator('tbody tr td:nth-child(6)').allInnerTexts()) expect(t.trim()).toMatch(/^(\d\d:\d\d (AM|PM) – \d\d:\d\d (AM|PM)|From \d\d:\d\d (AM|PM)|Flexible)$/);
});

test('cards, filters, Sr. No. + staff ID, people with no entry today ("Not in yet"), PDF of the view', async ({ page }) => {
    await openAdmin(page);
    const now = new Date();
    const early = new Date(now); early.setHours(Math.max(0, now.getHours() - 2), 0, 0, 0);
    await putRow(page, 'r-in', { status: 'Present', source: 'staff-web', staffName: 'Bhawna', date: key(early), dateISO: iso(early), checkIn: early.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), checkOut: '--', inAt: early.toISOString() });
    await adminTab(page, 'attendance');
    // the header shows only "Live" here: room counts belong to the room pages
    await expect(page.getByTestId('admin-live')).toBeVisible();
    await expect(page.getByTestId('stat-occupied')).toHaveCount(0);
    await page.getByTestId('att-scope-day').click();
    const ledger = page.getByTestId('att-register');
    await expect(ledger.getByRole('row').filter({ hasText: 'Bhawna' })).toHaveCount(1, { timeout: 15000 });
    // today: everybody working is listed; the ones without a check-in say so
    const total = Number(await page.getByTestId('att-total-staff').innerText());
    expect(total).toBeGreaterThan(3);
    await expect(ledger.locator('tbody tr')).toHaveCount(total);
    await expect(ledger.locator('tbody tr[data-status="notin"]')).toHaveCount(total - 1);
    await expect(page.getByTestId('att-absent-today')).toHaveText(String(total - 1));
    // Sr. No. 1..n and the staff ID column
    expect(await ledger.locator('tbody tr td:first-child').allInnerTexts()).toEqual(Array.from({ length: total }, (_, i) => String(i + 1)));
    // filters
    await page.getByTestId('att-filter-status').selectOption('present');
    await expect(ledger.locator('tbody tr')).toHaveCount(1);
    await expect(ledger.locator('tbody tr')).toContainText('Bhawna');
    await page.getByTestId('att-filter-reset').click();
    await page.getByTestId('att-filter-search').fill('varun');
    await expect(ledger.locator('tbody tr')).toHaveCount(1);
    await page.getByTestId('att-filter-search').fill('zzz');
    await expect(page.getByTestId('att-empty')).toHaveText('Nothing matches these filters.');
    await page.getByTestId('att-filter-reset').click();
    await page.getByTestId('att-filter-dept').selectOption('Kitchen');
    for (const t of await ledger.locator('tbody tr td:nth-child(4)').allInnerTexts()) expect(t.trim()).toBe('KITCHEN');
    await page.getByTestId('att-filter-reset').click();
    // PDF of what is on screen
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('att-export-pdf').click()]);
    expect(dl.suggestedFilename()).toMatch(/^HotelSky5_Attendance_.*\.pdf$/);
    // ranges
    await page.getByTestId('att-scope-week').click();
    await expect(ledger.locator('tbody tr[data-status="notin"]')).toHaveCount(0);   // missing people only on a single day
    await expect(ledger.getByRole('row').filter({ hasText: 'Bhawna' }).filter({ hasText: key(early) })).toHaveCount(1);
});

test('one person, one row: phone check-in + a later AuraLock tablet scan = first scan IN, last scan OUT, "2 scans"', async ({ page, context }) => {
    const now = new Date();
    const early = new Date(now); early.setHours(Math.max(0, now.getHours() - 3), 5, 0, 0);
    const later = new Date(now); later.setHours(Math.max(1, now.getHours() - 1), 40, 0, 0);
    const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    await context.route('http://board.test/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ companies: [{ company: 'Sky5 Hotel', staff: [
        { name: 'Varun', employeeId: 'SKY5-004', status: 'Present', in: hhmm(later), out: '' }] }] }) }));
    await openAdmin(page);
    const t = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    await putRow(page, 'r-phone', { status: 'Present', source: 'staff-web', staffName: 'Varun', date: key(early), dateISO: iso(early), checkIn: t(early), checkOut: '--', inAt: early.toISOString() });
    await adminTab(page, 'attendance');
    await page.getByTestId('att-scope-day').click();
    const varun = page.getByTestId('att-register').locator('tbody tr').filter({ hasText: 'Varun' });
    await expect(varun).toHaveCount(1, { timeout: 15000 });
    await expect(varun).toContainText('2 scans', { timeout: 15000 });
    await expect(varun).toContainText(t(early));
    await expect(varun).toContainText(t(later));                       // the last scan is the check-out
    await expect(varun).toContainText('Phone + Face scan (terminal)');
});

test('15-day trend chart: today on the right, hover shows the day, no a11y problems', async ({ page }) => {
    await openAdmin(page);
    const now = new Date();
    const y1 = new Date(now); y1.setDate(now.getDate() - 1); y1.setHours(9, 0, 0, 0);
    const t0 = new Date(now); t0.setHours(Math.max(0, now.getHours() - 1), 0, 0, 0);
    const time = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    await putRow(page, 'tr-1', { status: 'Present', source: 'staff-web', staffName: 'Bhawna', date: key(y1), dateISO: iso(y1), checkIn: time(y1), checkOut: '--', inAt: y1.toISOString() });
    await putRow(page, 'tr-2', { status: 'Present', source: 'staff-web', staffName: 'Varun', date: key(y1), dateISO: iso(y1), checkIn: time(y1), checkOut: '--', inAt: y1.toISOString() });
    await putRow(page, 'tr-3', { status: 'Present', source: 'staff-web', staffName: 'Karan', date: key(t0), dateISO: iso(t0), checkIn: time(t0), checkOut: '--', inAt: t0.toISOString() });
    await adminTab(page, 'attendance');
    const chart = page.getByTestId('att-trend');
    await expect(chart).toBeVisible();
    await expect(chart.locator('table tbody tr')).toHaveCount(15);
    await expect(chart.locator('table tbody tr').nth(13).locator('td').nth(1)).toHaveText('2');   // yesterday: 2 present
    await page.getByTestId(`att-trend-day-${key(y1)}`).hover();
    await expect(page.getByTestId('att-trend-tip')).toContainText('Present');
    await expect(page.getByTestId('att-trend-tip')).toContainText('2');
    if (process.env.SHOTS) await chart.screenshot({ path: `${process.env.SHOTS}/trend.png` });
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const axe = await new AxeBuilder({ page }).include('[data-testid="att-trend"]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.map(v => v.id)).toEqual([]);
});

test('the cards are buttons: Present / Late / Not in / Total show those people of today in the register', async ({ page }) => {
    await openAdmin(page);
    const now = new Date();
    const t0 = new Date(now); t0.setHours(Math.max(0, now.getHours() - 1), 0, 0, 0);
    const time = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    await putRow(page, 'c-1', { status: 'Present', source: 'staff-web', staffName: 'Bhawna', date: key(t0), dateISO: iso(t0), checkIn: time(t0), checkOut: '--', inAt: t0.toISOString() });
    await adminTab(page, 'attendance');
    await page.getByTestId('att-scope-all').click();   // somewhere else first: the card brings today back
    const rows = page.getByTestId('att-register').locator('tbody tr');
    await page.getByTestId('att-present-today-card').click();
    await expect(page.getByTestId('att-present-today-card')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('att-scope-day')).toHaveAttribute('aria-selected', 'true');
    await expect(rows).toHaveCount(1);
    await expect(rows).toContainText('Bhawna');
    const total = Number(await page.getByTestId('att-total-staff').innerText());
    await page.getByTestId('att-absent-today-card').click();
    await expect(rows).toHaveCount(total - 1);
    for (const st of await rows.evaluateAll(r => r.map(x => x.dataset.status))) expect(st).toBe('notin');
    await page.getByTestId('att-total-staff-card').click();
    await expect(rows).toHaveCount(total);
    await expect(page.getByTestId('att-total-staff-card')).toHaveAttribute('aria-pressed', 'true');
});
