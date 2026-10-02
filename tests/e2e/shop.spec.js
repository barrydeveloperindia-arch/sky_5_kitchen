import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, adminTab } from './helpers';

test.beforeEach(async ({ page }) => {
    await stubWindowOpen(page);
});

const card = (page, name) => page.locator('.modern-item-card', { has: page.locator('.item-title-modern', { hasText: name }) });

async function addItem(page, name, times = 1) {
    for (let i = 0; i < times; i++) await card(page, name).locator('.add-btn-square').click();
}

test('guest orders food to a room: cart -> payment -> invoice -> kitchen + room folio', async ({ page, isMobile }) => {
    const errors = trackErrors(page);
    await page.goto('/');

    await addItem(page, 'Aloo Paratha Combo', 2);
    await page.locator('.filter-chip', { hasText: 'Beverages' }).click();
    await card(page, 'Tea').first().locator('.add-btn-square').click();

    // 169*2 + 50 = 388; GST 5% = 19; total 407
    await expect(page.locator('.cart-floating-bar')).toContainText('3 Items');
    // the bar shows what the guest will actually pay (incl. GST), same as the cart
    await expect(page.locator('.cart-floating-bar')).toContainText('₹407 incl. GST');
    await page.locator('.cart-floating-bar').click();
    await expect(page.locator('.cart-item')).toHaveCount(2);
    await expect(page.locator('.bill-row.total')).toContainText('₹407');

    await page.getByRole('button', { name: 'PROCEED TO PAY ₹407' }).click();
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Room 5');
    await page.locator('.pay-option', { hasText: 'Room Charge' }).click();
    await page.getByRole('button', { name: 'CONFIRM ROOM CHARGE' }).click();

    const invoice = page.locator('#invoice-sheet');
    await expect(invoice).toContainText('Aloo Paratha Combo');
    await expect(invoice).toContainText('Tea');
    await expect(invoice).toContainText('₹388');
    // Room Charge: food goes on the room bill pre-GST; GST is added once there (no ₹1 rounding gap)
    await expect(page.getByTestId('invoice-gst')).toHaveText('added on room bill');
    await expect(page.getByTestId('invoice-total')).toHaveText('₹388');
    await expect(invoice).toContainText('ADDED TO ROOM BILL');

    await page.getByRole('button', { name: /SHARE VIA WHATSAPP/ }).click();
    const opened = await page.evaluate(() => window.__opened);
    const text = decodeURIComponent(opened.find(u => u.startsWith('https://wa.me/')).split('text=')[1]);
    expect(text).toContain('2x Aloo Paratha Combo');
    expect(text).toContain('ADDED TO ROOM BILL: ₹388');
    expect(text).not.toContain('undefined');

    // Cart is cleared after checkout
    await page.getByRole('button', { name: 'BACK TO HOME' }).click();
    await expect(page.locator('.cart-floating-bar')).toHaveCount(0);

    if (isMobile) return; // dashboard checks are desktop-only
    await page.getByText('Admin', { exact: true }).filter({ visible: true }).first().click();
    await adminTab(page, 'kitchen');
    await expect(page.locator('tr', { hasText: 'Room 5' }).first()).toContainText('2x Aloo Paratha Combo, 1x Tea');

    // Room folio gets the PRE-GST food amount (GST is added once at checkout)
    await adminTab(page, 'reception');
    const room5 = page.getByTestId('room-card-5');
    await expect(room5).toContainText(/Food Bill:\s*₹388/);
    expect(errors).toEqual([]);
});

test('booking a room shows the room name in cart and invoice (not blank/undefined)', async ({ page }) => {
    await page.goto('/');
    await page.locator('.filter-chip', { hasText: 'Stays' }).click();
    await page.locator('.luxury-room-card', { hasText: 'Deluxe Room' }).first().getByRole('button', { name: 'BOOK NOW' }).click();
    await page.locator('.cart-floating-bar').click();
    await expect(page.locator('.cart-item-name')).toHaveText(/Room/);
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Table 1');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await expect(page.locator('#invoice-sheet')).toContainText('Super Deluxe Room');
    await expect(page.locator('#invoice-sheet')).not.toContainText('undefined');
});

test('checkout is blocked without a table/room number', async ({ page }) => {
    await page.goto('/');
    await addItem(page, 'Masala Papad');
    await page.locator('.cart-floating-bar').click();
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await expect(page.locator('#invoice-sheet')).toHaveCount(0);
});

test('QR table link pre-fills the table number', async ({ page }) => {
    await page.goto('/?table=7');
    await addItem(page, 'Masala Papad');
    await page.locator('.cart-floating-bar').click();
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await expect(page.getByPlaceholder('e.g. Table 4 or Room 102')).toHaveValue('Table 7');
});

test('cart quantity +/- and remove', async ({ page }) => {
    await page.goto('/');
    await addItem(page, 'Masala Papad');
    await page.locator('.cart-floating-bar').click();
    const row = page.locator('.cart-item', { hasText: 'Masala Papad' });
    await row.getByRole('button', { name: '+' }).click();
    await row.getByRole('button', { name: '+' }).click();
    await expect(row.locator('.qty-control span')).toHaveText('3');
    await expect(page.locator('.bill-row.total')).toContainText(`₹${300 + Math.round(300 * 0.05)}`);
    for (let i = 0; i < 3; i++) await row.getByRole('button', { name: '-' }).click();
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
});

test('cart survives reload; corrupt or stale saved cart does not crash the shop', async ({ page }) => {
    await page.goto('/');
    await addItem(page, 'Masala Papad', 2);
    await page.reload();
    await expect(page.locator('.cart-floating-bar')).toContainText('2 Items');

    const errors = trackErrors(page);
    await page.evaluate(() => localStorage.setItem('sky5_cart', '{broken json'));
    await page.reload();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();

    // 3004 = Paneer Deluxe Thali, removed from the menu in June
    await page.evaluate(() => localStorage.setItem('sky5_cart', JSON.stringify({ 3004: 3, 2001: 1 })));
    await page.reload();
    await expect(page.locator('.cart-floating-bar')).toContainText('1 Items');
    expect(errors).toEqual([]);
});

test('search filters items by name', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Search "Paneer Butter Masala"...').fill('paneer');
    const names = await page.locator('.item-title-modern').allInnerTexts();
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.toLowerCase()).toContain('paneer');
});
