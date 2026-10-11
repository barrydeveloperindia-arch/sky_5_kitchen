import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { stubWindowOpen, openAdmin } from './helpers';

// Colour contrast + labels + roles (WCAG 2 AA) on every screen. Decorative parts marked
// aria-hidden (invoice watermark) are left out. Any new violation fails the build.
test.describe.configure({ timeout: 180000 });

async function check(page, name, found) {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).exclude('[aria-hidden="true"]').analyze();
    for (const v of r.violations) found.push(`${name}: ${v.id} x${v.nodes.length} -> ${v.nodes[0].target.join(' ')} ${(v.nodes[0].failureSummary || '').split('\n')[1] || ''}`);
}

for (const width of [1440, 390]) test(`shop, cart, payment, invoice, menu card, staff inventory at ${width}px: no accessibility / contrast issues`, async ({ page }) => {
    const found = [];
    await page.setViewportSize({ width, height: 900 });
    await stubWindowOpen(page);
    await page.goto('/');
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await check(page, 'shop', found);
    await page.getByRole('button', { name: 'VIEW CARD' }).click();
    await check(page, 'menu card', found);
    await page.getByRole('button', { name: /CLOSE PREVIEW/ }).click();
    await page.getByRole('button', { name: 'Add Masala Papad to cart' }).click();
    await page.locator('.cart-floating-bar').click();
    await page.waitForTimeout(600); // cart slide-in animation
    await check(page, 'cart', found);
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await check(page, 'payment', found);
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Table 3');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await expect(page.locator('#invoice-sheet')).toBeVisible();
    await check(page, 'invoice', found);
    await page.goto('/inventory');
    await expect(page.getByTestId('inventory-view')).toBeVisible({ timeout: 20000 });
    await check(page, 'staff entry', found);
    await page.getByTestId('inv-tab-stock').click();
    await check(page, 'staff stock', found);
    await page.getByTestId('inv-tab-history').click();
    await check(page, 'staff history', found);
    expect(found).toEqual([]);
});

test('every OPS Center tab and the room sheet: no accessibility / contrast issues', async ({ page, isMobile }) => {
    test.skip(isMobile, 'admin is a desktop screen');
    const found = [];
    await stubWindowOpen(page);
    await openAdmin(page);
    await expect(page.getByTestId('admin-live')).toHaveText('● Live', { timeout: 15000 });
    for (const t of ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu-config']) {
        await page.getByTestId(`nav-${t}`).click();
        await page.waitForTimeout(300);
        await check(page, t, found);
    }
    await page.getByTestId('nav-reception').click();
    await page.getByTestId('room-open-5').click();
    await expect(page.getByTestId('room-sheet')).toBeVisible();
    await check(page, 'room sheet', found);
    expect(found).toEqual([]);
});
