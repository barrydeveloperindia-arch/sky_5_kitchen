import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, adminTab } from './helpers';

// One test per shop button / control, so a broken button points straight at itself.

test.beforeEach(async ({ page }) => {
    await stubWindowOpen(page);
    await page.goto('/');
});

const card = (page, name) => page.locator('.modern-item-card', { has: page.locator('.item-title-modern', { hasText: name }) });
const openedUrls = (page) => page.evaluate(() => window.__opened);

async function addAndPay(page, { item = 'Masala Papad', table, method }) {
    await card(page, item).locator('.add-btn-square').click();
    await page.locator('.cart-floating-bar').click();
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill(table);
    if (method) await page.locator('.pay-option', { hasText: method }).click();
    await page.getByRole('button', { name: method === 'Room Charge' ? 'CONFIRM ROOM CHARGE' : 'PLACE ORDER' }).click();
}

test('header: Menu Card and Admin links; ORDER NOW scrolls to menu', async ({ page, isMobile }) => {
    const errors = trackErrors(page);
    if (isMobile) {
        // phone: the header text menu is hidden (it used to run off the screen); the bottom bar has the same links
        await expect(page.locator('.desktop-menu')).toBeHidden();
        await page.locator('.bottom-tabs .nav-tab', { hasText: 'Menu' }).click();
    } else {
        await page.locator('.desktop-menu').getByText('Menu Card').click();
    }
    await expect(page.locator('.menu-print-container')).toBeVisible();
    await page.getByRole('button', { name: /CLOSE PREVIEW/ }).click();

    await page.getByRole('button', { name: 'ORDER NOW' }).click();
    await expect(page.locator('.section-title-modern').first()).toBeInViewport();

    if (!isMobile) {
        await page.locator('.desktop-menu').getByText('Admin').click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
    }
    expect(errors).toEqual([]);
});

test('every category chip filters to its own items', async ({ page }) => {
    const chips = await page.locator('.filter-chip .filter-name').allInnerTexts();
    for (const name of chips) {
        await page.locator('.filter-chip', { hasText: name }).first().click();
        if (name === 'Stays') { await expect(page.locator('.luxury-room-card').first()).toBeVisible(); continue; }
        if (name === 'Ambiance') { await expect(page.locator('.room-card').first()).toBeVisible(); continue; }
        const count = await page.locator('.modern-item-card').count();
        expect(count, name).toBeGreaterThan(0);
        await expect(page.locator('.see-all')).toHaveText(`See all (${count})`);
    }
});

test('bottom tabs: Home resets filters, Search focuses the search box, Bag / Menu / Admin open', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'bottom tabs are the phone navigation (hidden on desktop)');
    await page.locator('.filter-chip', { hasText: 'Snacks' }).click();
    await page.getByPlaceholder('Search "Paneer Butter Masala"...').fill('pakora');
    await page.getByTestId('tab-home').click();
    await expect(page.getByPlaceholder('Search "Paneer Butter Masala"...')).toHaveValue('');
    await expect(page.locator('.filter-chip.active')).toContainText('Explore All');

    await page.getByTestId('tab-search').click();
    await expect(page.getByPlaceholder('Search "Paneer Butter Masala"...')).toBeFocused();

    await page.locator('.bottom-tabs').getByText('Bag').click();
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
    await page.locator('.cart-header .close-btn').click();

    await page.locator('.bottom-tabs').getByText('Menu').click();
    await expect(page.locator('.menu-print-container')).toBeVisible();
    await page.getByRole('button', { name: /CLOSE PREVIEW/ }).click();

    await page.locator('.bottom-tabs').getByText('Admin').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
});

test('menu card: WhatsApp share sends the menu PDF link; Print calls print', async ({ page }) => {
    await page.getByRole('button', { name: 'VIEW CARD' }).click();
    await page.getByRole('button', { name: /SHARE ON WHATSAPP/ }).click();
    const url = (await openedUrls(page)).find(u => u.includes('whatsapp.com'));
    expect(decodeURIComponent(url)).toContain('/menu.pdf');
    await page.getByRole('button', { name: /PRINT \/ SAVE AS PDF/ }).click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
});

test('payment: UPI order is NOT added to the room bill (no double charge)', async ({ page, isMobile }) => {
    test.skip(isMobile, 'checks the admin folio');
    await addAndPay(page, { table: 'Room 5', method: 'UPI' });
    await expect(page.getByTestId('invoice-payment')).toContainText('UPI');
    await page.getByRole('button', { name: 'BACK TO HOME' }).click();
    await page.locator('.desktop-menu').getByText('Admin').click();
    await adminTab(page, 'reception');
    await expect(page.getByTestId('room-card-5')).toContainText(/Food Bill:\s*₹0/);
    await adminTab(page, 'kitchen');
    await expect(page.locator('tr', { hasText: 'Room 5' }).first()).toContainText('1x Masala Papad');
});

test('payment: Room Charge needs an occupied room', async ({ page }) => {
    await addAndPay(page, { table: 'Table 3', method: 'Room Charge' });
    await expect(page.locator('.toast-notification')).toContainText('For Room Charge enter the room');
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Room 2'); // room 2 is free (no guest)
    await page.getByRole('button', { name: 'CONFIRM ROOM CHARGE' }).click();
    await expect(page.locator('.toast-notification')).toContainText('Room 2 has no checked-in guest');
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Room 5');
    await page.getByRole('button', { name: 'CONFIRM ROOM CHARGE' }).click();
    await expect(page.getByTestId('invoice-payment')).toContainText('Charged to Room 5');
});

test('each payment option is selectable and shown on the invoice', async ({ page }) => {
    for (const method of ['UPI', 'Card', 'COD']) {
        await addAndPay(page, { table: 'Table 4', method });
        await expect(page.getByTestId('invoice-payment')).toContainText(method);
        await page.getByRole('button', { name: 'BACK TO HOME' }).click();
    }
});

test('invoice: Print, WhatsApp (with payment mode) and Back to Home', async ({ page }) => {
    await addAndPay(page, { table: 'Table 4', method: 'Card' });
    await page.getByRole('button', { name: /PRINT \/ SAVE AS PDF/ }).click();
    expect(await page.evaluate(() => window.__printed)).toBe(1);
    await expect(page.locator('.no-print').filter({ has: page.getByRole('button', { name: 'BACK TO HOME' }) })).toHaveCount(1);
    await page.getByRole('button', { name: /SHARE VIA WHATSAPP/ }).click();
    const text = decodeURIComponent((await openedUrls(page)).find(u => u.startsWith('https://wa.me/')).split('text=')[1]);
    expect(text).toContain('*Payment:* Card');
    expect(text).toContain('1x Masala Papad');
    await page.getByRole('button', { name: 'BACK TO HOME' }).click();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
});

test('cart and payment screens close with ✕', async ({ page }) => {
    await card(page, 'Masala Papad').locator('.add-btn-square').click();
    await page.locator('.cart-floating-bar').click();
    await page.locator('.cart-header .close-btn').click();
    await expect(page.locator('.cart-view')).toHaveCount(0);
    await page.locator('.cart-floating-bar').click();
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
    await page.locator('.cart-header .close-btn').click();
    await expect(page.locator('.cart-view')).toHaveCount(0);
});

test('stays: live availability, occupied rooms cannot be booked, Check Availability filters', async ({ page }) => {
    await page.locator('.filter-chip', { hasText: 'Stays' }).click();
    const all = await page.locator('[data-testid^="stay-room-"]').count();
    expect(all).toBe(17);
    const occupied = page.getByTestId('stay-room-5');
    await expect(occupied).toContainText('OCCUPIED');
    await expect(occupied.getByRole('button', { name: 'OCCUPIED' })).toBeDisabled();
    await expect(page.getByTestId('stay-room-2')).toContainText('AVAILABLE');
    await expect(page.getByText('⭐ 4.9')).toHaveCount(0);

    await page.getByTestId('stay-guests').selectOption('3 Guests');
    await page.getByTestId('stay-check').click();
    await expect(page.locator('.toast-notification')).toContainText('14 rooms free now for 3 Guests');
    await expect(page.locator('[data-testid^="stay-room-"]')).toHaveCount(14);
    await expect(page.getByTestId('stay-room-5')).toHaveCount(0);
    await page.getByTestId('stay-show-all').click();
    await expect(page.locator('[data-testid^="stay-room-"]')).toHaveCount(17);
});

test('room booking is not sent to the kitchen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'checks the admin kitchen');
    await page.locator('.filter-chip', { hasText: 'Stays' }).click();
    await page.getByTestId('stay-room-2').getByRole('button', { name: 'BOOK NOW' }).click();
    await page.locator('.cart-floating-bar').click();
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Walk-in');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await expect(page.locator('#invoice-sheet')).toContainText('Deluxe Room');
    await page.getByRole('button', { name: 'BACK TO HOME' }).click();
    await page.locator('.desktop-menu').getByText('Admin').click();
    await adminTab(page, 'kitchen');
    await expect(page.locator('tr', { hasText: 'Walk-in' })).toHaveCount(0);
});

test('footer Google Maps link points to the hotel location', async ({ page }) => {
    const link = page.getByRole('link', { name: /View on Google Maps/ });
    await expect(link).toHaveAttribute('href', 'https://maps.app.goo.gl/vYD2Yq42HKpCsr2J9');
    await expect(link).toHaveAttribute('target', '_blank');
});
