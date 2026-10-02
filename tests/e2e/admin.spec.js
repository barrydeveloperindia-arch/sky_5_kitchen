import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';
import { combos } from '../../02_Application_Source/data/combos';

// Modal inputs have no placeholder; find them by their label text
const field = (page, label) => page.locator('label', { hasText: label }).locator('..').locator('input, select').first();

test.beforeEach(async ({ page }) => {
    await stubWindowOpen(page);
});

test('check-in a guest for 3 nights: folio, receipt and Finance agree', async ({ page }) => {
    const errors = trackErrors(page);
    await openAdmin(page);
    const room2 = page.getByTestId('room-card-2'); // Deluxe, ₹1800, Clean
    await room2.getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('Test Guest');
    await page.getByPlaceholder('Verified Mobile Number').fill('9999999999');
    const dt = page.locator('input[type="datetime-local"]');
    await dt.nth(0).fill('2026-09-26T12:00');
    await dt.nth(1).fill('2026-09-29T11:00');
    // 3 nights x 1800 = 5400; room GST 12% = 648; total 6048
    await expect(page.getByText('TOTAL BILLED:').locator('..')).toContainText('₹6,048');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();

    await expect(room2).toContainText('OCCUPIED');
    await expect(room2).toContainText(/Balance due:\s*₹6,048/);
    await expect(page.getByTestId('stat-occupied')).toContainText('4');

    await room2.getByRole('button', { name: 'PRINT RECEIPT' }).click();
    const receipt = (await page.evaluate(() => window.__opened)).join('');
    expect(receipt).toContain('3 nights × ₹1,800');
    expect(receipt).toContain('₹6,048');
    expect(receipt).not.toContain('PAID & VERIFIED'); // nothing paid yet

    await adminTab(page, 'finance');
    await expect(page.locator('div', { has: page.getByRole('heading', { name: 'Pending Balances' }) }).last()).toContainText('₹');
    await expect(page.getByText('vs Yesterday')).toHaveCount(0);
    await expect(page.getByText('₹32,500.00')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('GST toggle off: modal and receipt both drop GST', async ({ page }) => {
    await openAdmin(page);
    const room4 = page.getByTestId('room-card-4');
    await room4.getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('No GST Guest');
    await page.getByText('EXCLUDING GST', { exact: false }).count(); // ensure modal rendered
    // Toggle is the rounded switch next to the GST label
    await page.locator('div[style*="border-radius: 13px"]').first().click();
    await expect(page.getByText('TOTAL BILLED:').locator('..')).toContainText('₹1,800');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await room4.getByRole('button', { name: 'PRINT RECEIPT' }).click();
    const receipt = (await page.evaluate(() => window.__opened)).join('');
    expect(receipt).toContain('GRAND TOTAL:</span>\n                                <span>₹1,800');
});

test('cleaning a dirty room frees it and the next guest starts with no food bill', async ({ page }) => {
    const errors = trackErrors(page);
    await openAdmin(page);
    // Room 5 is occupied (seed). Check out -> Dirty -> Clean -> check-in again
    const room5 = page.getByTestId('room-card-5');
    await room5.getByRole('button', { name: 'CHECK-OUT' }).click();
    await field(page, 'Inspected By').selectOption({ index: 1 });
    // Balance is due -> checkout waits for payment confirmation
    page.once('dialog', d => d.dismiss());
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    await expect(page.getByRole('heading', { name: 'CHECKOUT INSPECTION' })).toBeVisible();
    let msg = '';
    page.once('dialog', d => { msg = d.message(); d.accept(); });
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    expect(msg).toContain('is still due');
    await expect(room5).toContainText('DIRTY');
    await adminTab(page, 'finance');
    await expect(page.getByTestId('finance-settlements')).toContainText('Mr. Raj Sharma');
    await adminTab(page, 'reception');

    await adminTab(page, 'cleaning');
    await page.getByRole('button', { name: 'RECORD CLEANING' }).first().click();
    await field(page, 'Room Number').fill('5');
    await field(page, 'Staff Name').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'COMPLETE CLEANING' }).click();

    await adminTab(page, 'reception');
    await expect(room5).toContainText('CLEAN');
    await room5.getByRole('button', { name: 'CHECK-IN' }).click();
    await expect(page.getByText('Sky Kitchen (Dining):').locator('..')).toContainText('₹0');
    expect(errors).toEqual([]);
});

test('attendance quick CHECK-OUT updates the clicked row', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'attendance');
    const row = page.locator('tr', { hasText: 'Arjun Tiwari' });
    await row.getByRole('button', { name: 'CHECK-OUT' }).click();
    await expect(row.getByRole('button', { name: 'CHECK-OUT' })).toHaveCount(0);
    await expect(row).toContainText(/\d{2}:\d{2}\s?(AM|PM)/);
});

test('attendance quick CHECK-IN updates the row instead of adding a duplicate', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'attendance');
    await expect(page.locator('tr', { hasText: 'Amresh Kumar' })).toHaveCount(1);
    await page.locator('tr', { hasText: 'Amresh Kumar' }).getByRole('button', { name: 'CHECK-IN' }).click();
    await expect(page.locator('tr', { hasText: 'Amresh Kumar' })).toHaveCount(1);
    await expect(page.locator('tr', { hasText: 'Amresh Kumar' }).getByRole('button', { name: 'CHECK-IN' })).toHaveCount(0);
});

test('menu config: hidden item disappears from the shop, price change shows up', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'menu-config');
    const teaRow = page.locator('tr', { has: page.getByText('Tea', { exact: true }) });
    await teaRow.getByRole('button', { name: 'ACTIVE' }).click();
    await expect(teaRow.getByRole('button', { name: 'HIDDEN' })).toBeVisible();

    const lassiRow = page.locator('tr', { has: page.getByText('Sweet Lassi', { exact: true }) });
    await lassiRow.locator('input[type="number"]').fill('119');
    await lassiRow.locator('input[type="number"]').press('Enter');

    await page.getByRole('heading', { name: 'OPS CENTER' }).click();
    await page.locator('.filter-chip', { hasText: 'Beverages' }).click();
    await expect(page.locator('.item-title-modern', { hasText: /^🟢\s*Tea$/ })).toHaveCount(0);
    await expect(page.locator('.modern-item-card', { hasText: 'Sweet Lassi' })).toContainText('₹119');
});

test('CCTV config cancel does not reload the page (keeps in-memory data)', async ({ page }) => {
    await openAdmin(page);
    await page.evaluate(() => { window.__marker = 'still-here'; });
    page.once('dialog', d => d.dismiss());
    await page.getByRole('button', { name: /CONFIG/ }).click();
    expect(await page.evaluate(() => window.__marker)).toBe('still-here');
});

test('kitchen: PREPARE -> SERVE -> DELIVERED', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'kitchen');
    const row = page.locator('tr', { hasText: 'ORD-8241' });
    await row.getByRole('button', { name: 'PREPARE' }).click();
    await row.getByRole('button', { name: 'SERVE' }).click();
    await expect(row).toContainText('DELIVERED');
});

// QA night round 11: the printable menu card shows the prices / items set in Menu Config
test('menu card preview follows Menu Config: new price shown, hidden item gone', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'menu-config');
    const papad = page.locator('tr', { has: page.getByText('Masala Papad', { exact: true }) });
    const price = papad.locator('input[type="number"]');
    await price.fill('77');
    await price.press('Enter');
    const tea = page.locator('tr', { has: page.getByText('Tea', { exact: true }) });
    await tea.getByRole('button', { name: 'ACTIVE' }).click();
    await page.getByRole('heading', { name: 'OPS CENTER' }).click();
    await page.getByRole('button', { name: 'VIEW CARD' }).click();
    const card = page.locator('.menu-print-container');
    await expect(card).toBeVisible();
    const text = await card.innerText();
    expect(text).toMatch(/Masala Papad[\s\S]{0,40}₹77/i);
    expect(text).not.toMatch(/(^|\n|\/ )TEA( \/|\n|$)/);
    expect(text).not.toMatch(/undefined|NaN/);
    // every active menu item is printed on the card (nothing silently dropped)
    const upper = text.toUpperCase();
    const missing = combos.filter(c => c.name !== 'Tea' && !upper.includes(c.name.toUpperCase())).map(c => c.name);
    expect(missing).toEqual([]);
});
