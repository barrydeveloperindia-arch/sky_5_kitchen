import { test, expect } from '@playwright/test';
import fs from 'fs';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';

// Every button / control in the OPS Center, tab by tab. Admin is a desktop screen.
test.skip(({ isMobile }) => isMobile, 'desktop screen');

const field = (page, label) => page.locator('label', { hasText: label }).locator('..').locator('input, select, textarea').first();
const opened = async (page) => page.evaluate(() => window.__opened);
const lastWhatsApp = async (page) => {
    const url = (await opened(page)).filter(u => typeof u === 'string' && u.startsWith('https://wa.me/')).pop();
    return decodeURIComponent(url.split('text=')[1]);
};
const printedHtml = async (page) => (await opened(page)).filter(h => typeof h === 'string' && h.includes('<html')).pop() || (await opened(page)).join('');
// Accept (or dismiss) the next browser dialog and hand back its message
const onNextDialog = (page, action = 'accept', value) => new Promise(resolve => {
    page.once('dialog', d => { resolve(d.message()); if (action === 'accept') d.accept(value); else d.dismiss(); });
});

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await openAdmin(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

// ---------------- Sidebar ----------------
test('sidebar: OPS CENTER goes back to the shop', async ({ page }) => {
    await page.getByRole('heading', { name: 'OPS CENTER' }).click();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
});

// ---------------- Reception ----------------
test('reception: SHARE RATES sends the rate card on WhatsApp', async ({ page }) => {
    await page.getByRole('button', { name: /SHARE RATES/ }).click();
    const text = await lastWhatsApp(page);
    expect(text).toContain('HOTEL SKY 5 - OFFICIAL RATE CARD');
    expect(text).toContain('Rooms:');
});

test('reception: CCTV CONFIG saves camera links and marks a dead stream offline', async ({ page }) => {
    const msg = onNextDialog(page, 'accept', 'http://127.0.0.1:1/cam1.mjpg,http://127.0.0.1:1/cam2.mjpg');
    await page.getByRole('button', { name: /CONFIG/ }).click();
    expect(await msg).toContain('Camera');
    await expect(page.getByText('CAM 1 OFFLINE')).toBeVisible({ timeout: 10000 });
    expect(await page.evaluate(() => localStorage.getItem('sky5_cams'))).toContain('cam2.mjpg');
});

test('reception: MARK CLEANED frees a dirty room', async ({ page }) => {
    await page.getByTestId('room-card-3').getByRole('button', { name: 'MARK CLEANED' }).click();
    await expect(page.getByTestId('room-card-3')).toContainText('CLEAN');
    await expect(page.getByTestId('room-card-3').getByRole('button', { name: 'CHECK-IN' })).toBeVisible();
    await expect(page.getByTestId('stat-dirty')).toContainText('2');
    await expect(page.getByTestId('stat-available')).toContainText('12');
});

test('reception: EDIT GUEST opens the saved guest (check-in shown) and CANCEL changes nothing', async ({ page }) => {
    const room5 = page.getByTestId('room-card-5');
    await room5.getByRole('button', { name: 'EDIT GUEST' }).click();
    await expect(page.getByRole('heading', { name: 'GUEST DOSSIER' })).toBeVisible();
    await expect(page.getByPlaceholder('Lead Guest Full Name')).toHaveValue('Mr. Raj Sharma');
    await expect(page.locator('input[type="datetime-local"]').first()).toHaveValue('2026-04-28T11:30');
    await page.getByPlaceholder('Lead Guest Full Name').fill('Changed Name');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page.getByRole('heading', { name: 'GUEST DOSSIER' })).toHaveCount(0);
    await expect(room5).toContainText('Mr. Raj Sharma');
});

test('reception: guest name is required', async ({ page }) => {
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    const msg = onNextDialog(page);
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    expect(await msg).toBe('Guest name is required.');
    await expect(page.getByRole('heading', { name: 'GUEST REGISTRATION' })).toBeVisible();
});

test('reception: occupants, advance, printable bill, PRINT BILL (prints the bill, not a blank page) and CLOSE', async ({ page }) => {
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('Asha Verma');
    await page.getByPlaceholder('Verified Mobile Number').fill('9800000000');
    await page.getByPlaceholder('Enter full address, ID info, or city').fill('Sector 9, Panchkula');
    await field(page, 'Adult Occupants').selectOption({ label: '2 Adult(s)' });
    await field(page, 'Child Occupants').selectOption({ label: '1 Child(ren)' });
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill('2026-09-27T12:00');
    await dt.nth(1).fill('2026-09-29T11:00');
    await field(page, 'Advance Payment').fill('1000');
    await page.getByPlaceholder('List all adult & child names staying in the room...').fill('Asha, Ravi, Kid');
    // 2 nights x 1800 = 3600 + 12% = 432 -> 4032
    await expect(page.getByText('TOTAL BILLED:').locator('..')).toContainText('₹4,032');

    await page.getByRole('button', { name: /GENERATE PRINTABLE BILL/ }).click();
    const bill = page.getByTestId('bill-sheet');
    await expect(bill).toContainText('OFFICIAL TAX INVOICE');
    await expect(bill).toContainText('OCCUPANCY: 2 Adult(s), 1 Child(ren)');
    await expect(bill).toContainText('2 nights × ₹1,800');
    await expect(bill).toContainText('ADVANCE PAID');
    await expect(bill).toContainText('₹3,032.00'); // net payable
    await expect(bill).toContainText('Disha Arcade');

    await page.getByRole('button', { name: /PRINT BILL/ }).click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(bill.getByText('OFFICIAL TAX INVOICE')).toBeVisible();
    await expect(page.getByRole('button', { name: /PRINT BILL/ })).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    await page.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await expect(bill).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'GUEST REGISTRATION' })).toBeVisible();
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await expect(page.getByTestId('room-card-2')).toContainText('Asha Verma');
});

test('reception: receipt for an existing guest has no "undefined" and counts nights so far', async ({ page }) => {
    await page.getByTestId('room-card-7').getByRole('button', { name: 'PRINT RECEIPT' }).click();
    const html = await printedHtml(page);
    expect(html).not.toContain('undefined');
    expect(html).toMatch(/\d+ nights × ₹1,800/);
    expect(html).toContain('Advance Paid:');
});

// ---------------- Kitchen ----------------
test('kitchen: SERVE on a preparing order marks it delivered', async ({ page }) => {
    await adminTab(page, 'kitchen');
    const row = page.locator('tr', { hasText: 'ORD-9102' });
    await row.getByRole('button', { name: 'SERVE' }).click();
    await expect(row).toContainText('DELIVERED');
});

// ---------------- Cleaning ----------------
test('cleaning: PRINT BLANK CHECKLISTS prints 10 slips; heading shows the real item count', async ({ page }) => {
    await adminTab(page, 'cleaning');
    await expect(page.getByText('OFFICIAL 13-ITEM ROOM INSPECTION CHECKLIST')).toBeVisible();
    await page.getByRole('button', { name: /PRINT BLANK CHECKLISTS/ }).click();
    const html = await printedHtml(page);
    expect((html.match(/HOUSEKEEPING CHECKLIST/g) || []).length).toBeGreaterThanOrEqual(10);
});

test('cleaning: log EDIT -> UPDATE LOG, PRINT, WHATSAPP; edit-modal slip uses the edited text', async ({ page }) => {
    await adminTab(page, 'cleaning');
    const row = page.locator('tr', { hasText: 'Veerwati' }).first();
    await row.getByRole('button', { name: 'EDIT' }).click();
    await expect(page.getByRole('button', { name: 'UPDATE LOG' })).toBeVisible();
    await field(page, 'Missing Items').fill("Guest's slipper");
    await page.getByRole('button', { name: /PRINT SLIP/ }).click();
    expect(await printedHtml(page)).toContain('Guest');
    await page.getByRole('button', { name: /SHARE WHATSAPP/ }).click();
    expect(await lastWhatsApp(page)).toContain("Guest's slipper");
    await page.getByRole('button', { name: 'UPDATE LOG' }).click();
    await expect(row).toContainText("Guest's slipper");

    await row.getByRole('button', { name: /PRINT/ }).click();
    expect(await printedHtml(page)).toContain('Room 3');
    await row.getByRole('button', { name: /WHATSAPP/ }).click();
    expect(await lastWhatsApp(page)).toContain('*Room:* 3');
});

test('cleaning: cannot clean an occupied room or a room that does not exist; CANCEL closes', async ({ page }) => {
    await adminTab(page, 'cleaning');
    await page.getByRole('button', { name: 'RECORD CLEANING' }).first().click();
    await field(page, 'Staff Name').selectOption({ index: 1 });
    await field(page, 'Room Number').fill('7');
    let msg = onNextDialog(page);
    await page.getByRole('button', { name: 'COMPLETE CLEANING' }).click();
    expect(await msg).toContain('Room 7 has a guest checked in');
    await field(page, 'Room Number').fill('99');
    msg = onNextDialog(page);
    await page.getByRole('button', { name: 'COMPLETE CLEANING' }).click();
    expect(await msg).toBe('Room 99 does not exist.');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page.getByRole('heading', { name: 'CLEANING LOG' })).toHaveCount(0);
    await adminTab(page, 'reception');
    await expect(page.getByTestId('room-card-7')).toContainText('OCCUPIED');
});

// ---------------- Laundry ----------------
test('laundry: PRINT BLANK COUPONS', async ({ page }) => {
    await adminTab(page, 'laundry');
    await page.getByRole('button', { name: /PRINT BLANK LAUNDRY COUPONS/ }).click();
    expect(await printedHtml(page)).toContain('LAUNDRY');
});

test('laundry: RECORD NEW pickup with +/- items; validation; CANCEL', async ({ page }) => {
    await adminTab(page, 'laundry');
    await page.getByRole('button', { name: /RECORD NEW LAUNDRY PICKUP/ }).click();
    await field(page, 'Room Number').fill('5');
    await field(page, 'Picked Up By').selectOption({ index: 1 });
    let msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE RECORD' }).click();
    expect(await msg).toBe('Add at least one laundry item.');

    const towel = page.getByText('Towel', { exact: true }).locator('..');
    await towel.getByRole('button', { name: '+' }).click();
    await towel.getByRole('button', { name: '+' }).click();
    await towel.getByRole('button', { name: '+' }).click();
    await towel.getByRole('button', { name: '-' }).click();
    await expect(towel.locator('input')).toHaveValue('2');

    await field(page, 'Room Number').fill('99');
    msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE RECORD' }).click();
    expect(await msg).toBe('Room 99 does not exist.');
    await field(page, 'Room Number').fill('5');
    await page.getByRole('button', { name: 'SAVE RECORD' }).click();
    await expect(page.getByRole('heading', { name: 'LAUNDRY PICKUP' })).toHaveCount(0);
    await expect(page.locator('tr', { hasText: 'Towel' }).first()).toContainText('2');

    await page.getByRole('button', { name: 'RECORD PICKUP' }).first().click();
    await expect(page.getByRole('heading', { name: 'LAUNDRY PICKUP' })).toBeVisible();
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page.getByRole('heading', { name: 'LAUNDRY PICKUP' })).toHaveCount(0);
});

test('laundry: log EDIT / PRINT / WHATSAPP', async ({ page }) => {
    // any alert during the flow is a failure, with its text (diagnoses a rare flake under full-suite load)
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
    await adminTab(page, 'laundry');
    await expect(page.getByTestId('admin-live')).toHaveText('● Live', { timeout: 15000 });
    const row = page.locator('tr', { hasText: 'Veerwati' }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /PRINT/ }).click();
    expect(await printedHtml(page)).toContain('Room 3');
    await row.getByRole('button', { name: /WHATSAPP/ }).click();
    expect(await lastWhatsApp(page)).toMatch(/DOUBLE BED SHEET: \d/i);
    await row.getByRole('button', { name: 'EDIT' }).click();
    await expect(page.getByRole('button', { name: 'UPDATE LOG' })).toBeVisible();
    await page.getByRole('button', { name: 'UPDATE LOG' }).click();
    expect(dialogs, 'no alert while updating the laundry log').toEqual([]);
    await expect(page.getByRole('heading', { name: 'LAUNDRY PICKUP' })).toHaveCount(0);
});

// ---------------- Room Checkouts ----------------
test('checkouts: PRINT BLANK COUPONS; new inspection needs a checked-in room', async ({ page }) => {
    await adminTab(page, 'checkouts');
    await page.getByRole('button', { name: /PRINT BLANK CHECKOUT COUPONS/ }).click();
    expect(await printedHtml(page)).toContain('Checkout');
    await page.getByRole('button', { name: /RECORD NEW INSPECTION/ }).click();
    await field(page, 'Room Number').fill('2');
    await field(page, 'Inspected By').selectOption({ index: 1 });
    const msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    expect(await msg).toBe('Room 2 has no checked-in guest.');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page.getByRole('heading', { name: 'CHECKOUT INSPECTION' })).toHaveCount(0);
});

test('checkouts: INSPECT & CHECKOUT with checklist toggles settles the bill and frees the room', async ({ page }) => {
    await adminTab(page, 'checkouts');
    // innermost card that holds both the guest name and its button
    const card = page.locator('div').filter({ hasText: 'Anita Desai' }).filter({ has: page.getByRole('button', { name: 'INSPECT & CHECKOUT' }) }).last();
    await card.getByRole('button', { name: 'INSPECT & CHECKOUT' }).click();
    await field(page, 'Inspected By').selectOption({ label: 'Veerwati (Housekeeping)' });
    const slippers = page.getByText('Slippers', { exact: true }).locator('..');
    await expect(slippers).toContainText('MIS');
    await slippers.click();
    await expect(slippers).toContainText('RET');
    const msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    expect(await msg).toContain('Room 7 (Anita Desai)');
    await adminTab(page, 'reception');
    await expect(page.getByTestId('room-card-7')).toContainText('DIRTY');
    await adminTab(page, 'finance');
    await expect(page.getByTestId('finance-settlements')).toContainText('Anita Desai');
});

test('checkouts: log EDIT shows the recorded inspector; PRINT / WHATSAPP', async ({ page }) => {
    await adminTab(page, 'checkouts');
    const row = page.locator('tr', { hasText: 'Karan' }).first();
    await row.getByRole('button', { name: /PRINT/ }).click();
    expect(await printedHtml(page)).toContain('Room 5');
    await row.getByRole('button', { name: /WHATSAPP/ }).click();
    expect(await lastWhatsApp(page)).toContain('ROOM KEYS');
    await row.getByRole('button', { name: 'EDIT' }).click();
    await expect(field(page, 'Inspected By')).toHaveValue('Karan');
    await page.getByRole('button', { name: 'UPDATE LOG' }).click();
    await expect(page.getByRole('heading', { name: 'CHECKOUT INSPECTION' })).toHaveCount(0);
});

// ---------------- Workforce ----------------
test('workforce: counts come from the staff list; SHARE ON WHATSAPP; call links', async ({ page }) => {
    await adminTab(page, 'workforce');
    await expect(page.getByTestId('wf-count-reception')).toHaveText('3 STAFF');
    await expect(page.getByTestId('wf-count-kitchen')).toHaveText('3 STAFF');
    await expect(page.getByTestId('wf-count-housekeeping')).toHaveText('3 STAFF');
    await page.getByRole('button', { name: /SHARE ON WHATSAPP/ }).click();
    expect(await lastWhatsApp(page)).toContain('Gaurav Panchal');
    const tel = page.locator('a[href^="tel:"]').first();
    await expect(tel).toHaveAttribute('href', /^tel:\+?\d/);
});

test('workforce: EDIT staff -> UPDATE; name required; CANCEL', async ({ page }) => {
    await adminTab(page, 'workforce');
    await page.getByText('EDIT', { exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'EDIT PERSONNEL' })).toBeVisible();
    await field(page, 'Phone Number').fill('+91 90000 00000');
    await page.getByRole('button', { name: 'UPDATE' }).click();
    await expect(page.getByText('+91 90000 00000')).toBeVisible();

    await page.getByText('EDIT', { exact: true }).first().click();
    await field(page, 'Full Name').fill('');
    const msg = onNextDialog(page);
    await page.getByRole('button', { name: 'UPDATE' }).click();
    expect(await msg).toBe('Staff name is required.');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page.getByRole('heading', { name: 'EDIT PERSONNEL' })).toHaveCount(0);
});

// ---------------- Attendance ----------------
test('attendance: DAILY exports only the selected day, MONTHLY that month, YEARLY everything', async ({ page }) => {
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: 'GRID' }).click();
    while (!(await page.getByTestId('cal-month').innerText()).startsWith('May')) await page.getByTestId('cal-prev').click();
    await page.getByTestId('cal-day-06-May').click();
    const csv = async (name) => {
        const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()]);
        const raw = fs.readFileSync(await dl.path(), 'utf8');
        expect(raw.charCodeAt(0), 'starts with a UTF-8 BOM so Excel shows ₹ / Hindi correctly').toBe(0xFEFF);
        return { name: dl.suggestedFilename(), body: raw.slice(1).replace(/\r\n/g, '\n') };
    };
    const daily = await csv('📅 DAILY');
    expect(daily.name).toContain('DAILY_06-May');
    expect(daily.body.trim().split('\n')).toHaveLength(10); // header + 9 rows dated 06-May
    const monthly = await csv('📊 MONTHLY');
    expect(monthly.name).toContain('MONTHLY_May-2026');
    expect(monthly.body.trim().split('\n')).toHaveLength(10);
    const yearly = await csv('📁 YEARLY');
    expect(yearly.body.split('\n')[0]).toBe('ID,Staff Name,Date,Check-In,Check-Out,Status');
});

test('attendance: calendar shows the real month, prev/next work, a day filters the register', async ({ page }) => {
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: 'GRID' }).click();
    const now = new Date();
    await expect(page.getByTestId('cal-month')).toHaveText(now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    await page.getByTestId('cal-next').click();
    await page.getByTestId('cal-prev').click();
    await expect(page.getByTestId('cal-month')).toHaveText(now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
    while (!(await page.getByTestId('cal-month').innerText()).startsWith('May')) await page.getByTestId('cal-prev').click();
    await page.getByTestId('cal-day-07-May').click();
    await expect(page.getByTestId('att-empty')).toContainText('07-May');
    await page.getByTestId('cal-day-06-May').click();
    await expect(page.locator('tr', { hasText: 'Gaurav Panchal' })).toHaveCount(1);
    await page.getByTestId('att-scope-all').click();
    await expect(page.getByTestId('att-empty')).toHaveCount(0);
    await page.getByRole('button', { name: 'LIST' }).click();
    await expect(page.getByText('Independence Day')).toBeVisible();
});

test('attendance: SHARE and alert SHARE on WhatsApp', async ({ page }) => {
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: '💬 SHARE', exact: true }).click();
    expect(await lastWhatsApp(page)).toContain('ATTENDANCE REPORT');
    await page.getByRole('button', { name: 'SHARE 🟢' }).first().click();
    expect(await lastWhatsApp(page)).toContain('*Name:*');
});

test('attendance: MANUAL LOG validates date and duplicates; saves a row', async ({ page }) => {
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: '+ MANUAL LOG' }).click();
    await field(page, 'Staff Name').selectOption({ label: 'Varun' });
    await page.getByPlaceholder('e.g., 06-May').fill('yesterday');
    let msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE LOG' }).click();
    expect(await msg).toBe('Enter the date like 06-May.');
    await page.getByPlaceholder('e.g., 06-May').fill('6 may');
    msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE LOG' }).click();
    expect(await msg).toContain('Varun already has attendance for 06-May');
    await page.getByPlaceholder('e.g., 06-May').fill('07-may');
    await page.getByPlaceholder('09:00 AM').fill('07:05 AM');
    await page.getByRole('button', { name: 'SAVE LOG' }).click();
    await expect(page.locator('tr', { hasText: 'Varun' })).toHaveCount(2);
    await page.getByRole('button', { name: '+ MANUAL LOG' }).click();
    await page.getByRole('button', { name: 'CANCEL' }).click();
});

test('attendance: ENROLL STAFF adds the person everywhere; duplicates blocked', async ({ page }) => {
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: '+ ENROLL STAFF' }).click();
    await page.getByPlaceholder('Enter Name').fill('Bhawna');
    await page.getByPlaceholder('e.g., Front Desk, Chef').fill('Housekeeping');
    let msg = onNextDialog(page);
    await page.getByRole('button', { name: 'ENROLL PERSONNEL' }).click();
    expect(await msg).toBe('Bhawna is already enrolled.');

    await page.getByPlaceholder('Enter Name').fill('Pooja Rani');
    await field(page, 'Department').selectOption('housekeeping');
    await page.getByPlaceholder('https://example.com/photo.jpg').fill('');
    await page.getByRole('button', { name: 'ENROLL PERSONNEL' }).click();
    await expect(page.locator('tr', { hasText: 'Pooja Rani' })).toContainText(/pending/i);

    // second enrolment form opens clean (no React controlled-input warning)
    await page.getByRole('button', { name: '+ ENROLL STAFF' }).click();
    await page.getByPlaceholder('https://example.com/photo.jpg').fill('https://x/y.jpg');
    await page.getByRole('button', { name: 'CANCEL' }).click();

    await adminTab(page, 'workforce');
    await expect(page.getByTestId('wf-count-housekeeping')).toHaveText('4 STAFF');
    await adminTab(page, 'cleaning');
    await page.getByRole('button', { name: 'RECORD CLEANING' }).first().click();
    await expect(field(page, 'Staff Name').locator('option', { hasText: 'Pooja Rani' })).toHaveCount(1);
});

// ---------------- Menu Config ----------------
test('menu config: price cannot go negative', async ({ page }) => {
    await adminTab(page, 'menu-config');
    const input = page.locator('tr', { has: page.getByText('Tea', { exact: true }) }).locator('input[type="number"]');
    await input.fill('-20');
    await input.press('Enter');
    await expect(input).toHaveValue('0');
    // empty box never publishes ₹0: the old price stays
    await input.fill('35');
    await input.press('Enter');
    await input.fill('');
    await input.press('Tab');
    await expect(input).toHaveValue('35');
});

// QA night 1: checkout used to bill the PLANNED check-out date and ignored over-paid advances
test('checkouts: early departure bills the nights actually stayed and asks to refund extra advance', async ({ page }) => {
    const pad = (n) => String(n).padStart(2, '0');
    const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0);
    const planned = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4, 11, 0);
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('Early Leaver');
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill(local(yesterday));
    await dt.nth(1).fill(local(planned));
    await field(page, 'Advance Payment').fill('20000');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    // before leaving, the card shows the planned stay as an estimate and the advance as a refund
    await page.getByTestId('room-open-2').click();
    await expect(page.getByTestId('room-sheet')).toContainText('Estimated bill');
    await expect(page.getByTestId('room-sheet')).toContainText('Refund due to guest');
    await page.keyboard.press('Escape');

    await adminTab(page, 'checkouts');
    const card = page.locator('div').filter({ hasText: 'Early Leaver' }).filter({ has: page.getByRole('button', { name: 'INSPECT & CHECKOUT' }) }).last();
    await card.getByRole('button', { name: 'INSPECT & CHECKOUT' }).click();
    await field(page, 'Inspected By').selectOption({ index: 1 });
    const msg = onNextDialog(page);
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    const text = await msg;
    expect(text).toContain('Room 2 (Early Leaver): 1 night,');
    expect(text).toContain('REFUND ₹');
    await adminTab(page, 'reception');
    await expect(page.getByTestId('room-card-2')).toContainText('DIRTY');
    // a guest who has left no longer shows a running bill
    await expect(page.getByTestId('room-card-2')).not.toContainText('Balance');
    await adminTab(page, 'finance');
    await expect(page.getByTestId('finance-settlements')).toContainText('Early Leaver');
});

test('attendance: WhatsApp report counts only today', async ({ page }) => {
    await adminTab(page, 'attendance');
    await page.getByRole('button', { name: '💬 SHARE', exact: true }).click();
    const msg = await lastWhatsApp(page);
    const present = Number(/\*Present:\* (\d+)/.exec(msg)[1]);
    const ledger = msg.split('DAILY LEDGER')[1].split('\n').filter(l => l.startsWith('• '));
    expect(present).toBeLessThanOrEqual(ledger.length);
    expect(msg).not.toMatch(/06-May.*\n[\s\S]*07-May/);
});

// QA night 1: on a phone the fixed 256px sidebar left ~40px for the content
test('phone width: OPS Center nav scrolls across the top and Reception / Today fit the screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('ops-sidebar')).toBeVisible();
    const box = await page.getByTestId('room-card-5').boundingBox();
    expect(box.width).toBeGreaterThan(300);
    for (const t of ['reception', 'today']) {
        await page.getByTestId(`nav-${t}`).click();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${t} overflows sideways`).toBeLessThanOrEqual(0);
    }
    await page.getByTestId('nav-menu-config').scrollIntoViewIfNeeded();
    await page.getByTestId('nav-menu-config').click();
    await expect(page.getByRole('heading', { name: 'Menu Config Dashboard' })).toBeVisible();
});

// QA night round 4: printed receipt — typed text is escaped, dates readable, GST-off and refund printed correctly
test('reception: receipt escapes typed text, prints readable dates, "GST: Not applied" and REFUND DUE', async ({ page }) => {
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill(`<b>O'Brien</b> & Co`);
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill('2026-09-29T10:00');
    await dt.nth(1).fill('2026-09-30T11:00');
    await field(page, 'Advance Payment').fill('5000');
    const gst = page.getByRole('switch', { name: 'GST taxation' });
    await expect(gst).toHaveAttribute('aria-checked', 'true');
    await gst.focus();
    await page.keyboard.press('Space'); // keyboard works too
    await expect(gst).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await page.getByTestId('room-card-2').getByRole('button', { name: 'PRINT RECEIPT' }).click();
    const html = await printedHtml(page);
    expect(html).toContain('&lt;b&gt;O&#39;Brien&lt;/b&gt; &amp; Co');
    expect(html).not.toContain('<b>O\'Brien</b>');
    expect(html).toMatch(/29 Sept? 2026/); // readable date
    expect(html).not.toContain('2026-09-29T10:00');
    expect(html).toMatch(/GST:<\/span><span>Not applied/);
    expect(html).not.toContain('GST on Room');
    // 1 night x 1800, no GST = 1800; advance 5000 -> refund 3200
    expect(html).toContain('REFUND DUE TO GUEST:');
    expect(html).toContain('₹3,200');
    expect(html).not.toContain('₹-');
    expect(html).not.toContain('class="stamp"'); // a refund is not "paid & verified"
});
