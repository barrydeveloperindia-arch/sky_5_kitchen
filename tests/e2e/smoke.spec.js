import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';
import { combos } from '../../02_Application_Source/data/combos';

test.beforeEach(async ({ page }) => {
    await stubWindowOpen(page);
});

test('shop home loads with brand, categories and every menu item', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(page).toHaveTitle('Hotel Sky 5');
    await expect(page.locator('.app-title-nav')).toContainText('Hotel Sky 5');
    await expect(page.locator('.modern-item-card')).toHaveCount(combos.length);
    await expect(page.locator('.see-all')).toHaveText(`See all (${combos.length})`);
    for (const cat of ['Breakfast', 'Snacks', 'Main Course', 'Thalis', 'Beverages', 'Stays', 'Ambiance']) {
        await expect(page.locator('.filter-chip', { hasText: cat })).toBeVisible();
    }
    expect(errors).toEqual([]);
});

test('every food image on the shop page actually loads', async ({ page }) => {
    await page.goto('/');
    const imgs = page.locator('.modern-item-card img');
    await imgs.first().scrollIntoViewIfNeeded();
    const broken = await page.evaluate(async () => {
        const els = [...document.querySelectorAll('.modern-item-card img')];
        await Promise.all(els.map(img => {
            img.loading = 'eager';
            return img.complete ? null : new Promise(r => { img.onload = img.onerror = r; });
        }));
        return els.filter(img => img.naturalWidth === 0).map(img => img.getAttribute('src'));
    });
    expect(broken).toEqual([]);
});

test('menu card preview opens, lists items with prices, and closes', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'VIEW CARD' }).click();
    const card = page.locator('.menu-print-container');
    await expect(card).toBeVisible();
    await expect(card).toContainText('PAGE 1 OF 2');
    await expect(card).toContainText('PAGE 2 OF 2');
    await expect(card).toContainText('Aloo Paratha Combo');
    await expect(card).toContainText('₹169');
    // Beverage group now includes Plain Soda, as on the printed PDF
    await expect(card).toContainText('Lemon Water / Fresh Lemonade / Plain Soda');
    await expect(card).toContainText('₹50 / 99 / 50');
    await page.getByRole('button', { name: /CLOSE PREVIEW/ }).click();
    await expect(card).toBeHidden();
    expect(errors).toEqual([]);
});

test('printable menu.html and menu.pdf are served', async ({ request }) => {
    const html = await request.get('/menu.html');
    expect(html.status()).toBe(200);
    expect(await html.text()).toContain('Aloo Paratha Combo');
    const pdf = await request.get('/menu.pdf');
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('pdf');
});

test('admin dashboard: every sidebar tab renders without errors', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'dashboard is a desktop screen');
    const errors = trackErrors(page);
    await openAdmin(page);
    const tabs = [
        ['today', 'Today'],
        ['reception', 'Reception Dashboard'],
        ['kitchen', 'Kitchen Dashboard'],
        ['cleaning', 'Cleaning Dashboard'],
        ['laundry', 'Laundry Dashboard'],
        ['checkouts', 'Checkouts Dashboard'],
        ['inventory', 'Inventory Dashboard'],
        ['workforce', 'Workforce Dashboard'],
        ['attendance', 'Personnel Attendance'],
        ['finance', 'Finance Dashboard'],
        ['menu-config', 'Menu Config Dashboard'],
    ];
    for (const [key, heading] of tabs) {
        await adminTab(page, key);
        await expect(page.getByRole('heading', { level: 1 }), key).toContainText(heading);
    }
    await expect(page.getByTestId('stat-occupied')).toContainText('3');
    await expect(page.getByTestId('stat-dirty')).toContainText('3');
    await expect(page.getByTestId('stat-available')).toContainText('11'); // 17 rooms in rooms.js
    expect(errors).toEqual([]);
});
