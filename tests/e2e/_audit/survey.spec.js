import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';

// One-off survey: collect accessibility violations + horizontal overflow per screen.
// Only runs when asked: AUDIT_OUT=<file> npx playwright test tests/e2e/_audit
test.skip(!process.env.AUDIT_OUT, 'audit survey runs on demand only');
const OUT = process.env.AUDIT_OUT;
const results = {};

async function scan(page, name) {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    results[name] = {
        overflow,
        violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, count: v.nodes.length, sample: v.nodes.slice(0, v.id === 'color-contrast' ? 500 : 3).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n')[1]) })),
    };
}

test.afterAll(() => { if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); });

test('survey', async ({ page }, testInfo) => {
    test.setTimeout(240000);
    const tag = testInfo.project.name;
    await page.addInitScript(() => { window.open = () => ({ document: { write() {}, close() {} } }); window.print = () => {}; });
    await page.goto('/');
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await scan(page, `${tag}:shop`);
    await page.getByRole('button', { name: 'VIEW CARD' }).click();
    await scan(page, `${tag}:menucard`);
    await page.getByRole('button', { name: /CLOSE PREVIEW/ }).click();
    const card = page.locator('.modern-item-card', { has: page.locator('.item-title-modern', { hasText: 'Masala Papad' }) });
    await card.locator('.add-btn-square').click();
    await page.locator('.cart-floating-bar').click();
    await scan(page, `${tag}:cart`);
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await scan(page, `${tag}:payment`);
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Table 3');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await scan(page, `${tag}:invoice`);
    await page.goto('/inventory');
    await expect(page.getByTestId('inventory-view')).toBeVisible({ timeout: 20000 });
    await scan(page, `${tag}:staff-entry`);
    await page.getByTestId('inv-tab-stock').click();
    await scan(page, `${tag}:staff-stock`);
    if (tag === 'mobile') return;
    await page.goto('/');
    await page.locator('.desktop-menu').getByText('Admin').click();
    await expect(page.getByTestId('admin-live')).toHaveText('● Live');
    for (const t of ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu-config']) {
        await page.getByTestId(`nav-${t}`).click();
        await page.waitForTimeout(300);
        await scan(page, `${tag}:admin-${t}`);
    }
    await page.getByTestId('nav-reception').click();
    await page.getByTestId('room-open-5').click();
    await expect(page.getByTestId('room-sheet')).toBeVisible();
    await scan(page, `${tag}:room-sheet`);
});
