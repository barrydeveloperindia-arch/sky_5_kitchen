import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, waitSaved } from './helpers';

// Every-button crawler: on each OPS Center tab, press every visible button once (emulator data only)
// and check the app never crashes, never logs an error and never shows NaN / undefined.
test.skip(({ isMobile }) => isMobile, 'desktop admin');
test.describe.configure({ timeout: 240000 });

const TABS = ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu-config'];
const BAD = /\bNaN\b|undefined|Infinity|₹-\d/;

for (const tab of TABS) {
    test(`crawler: every button on ${tab}`, async ({ page }) => {
        const errors = trackErrors(page);
        const dialogs = [];
        page.on('dialog', d => { dialogs.push(d.message()); d.dismiss().catch(() => {}); });
        await stubWindowOpen(page);
        await openAdmin(page);
        await waitSaved(page);
        const go = async () => { await page.getByTestId(`nav-${tab}`).click(); await page.waitForTimeout(150); };
        await go();
        await page.waitForTimeout(1500); // let synced lists and the inventory store load
        const labels = await page.locator('main button:visible').evaluateAll(bs => bs.map(b => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40)));
        if (tab !== 'finance') expect(labels.length, 'tab has buttons').toBeGreaterThan(0); // Finance is read-only
        const pressed = [];
        for (let i = 0; i < labels.length; i++) {
            const btn = page.locator('main button:visible').nth(i);
            if (!(await btn.count())) continue;
            if (await btn.isDisabled()) continue;
            const label = labels[i];
            await btn.click({ timeout: 3000 }).catch(() => {});
            pressed.push(label);
            await page.waitForTimeout(120);
            expect(await page.locator('main, [data-testid="ops-sidebar"]').count(), `app crashed after "${label}" on ${tab}: ${errors.join(' | ')}`).toBeGreaterThan(0);
            const text = await page.locator('body').innerText();
            expect(text, `broken value after "${label}" on ${tab}`).not.toMatch(BAD);
            // close whatever opened (modal / sheet / other screen) and come back to the tab
            await page.keyboard.press('Escape');
            for (const name of ['CANCEL', 'CLOSE', 'Close']) {
                const c = page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
                if (await c.count()) await c.click({ timeout: 1000 }).catch(() => {});
            }
            if (!(await page.getByTestId(`nav-${tab}`).isVisible().catch(() => false))) await openAdmin(page);
            await go();
        }
        if (tab !== 'finance') expect(pressed.length).toBeGreaterThan(0);
        expect(errors, `console errors on ${tab}`).toEqual([]);
        console.log(`${tab}: ${pressed.length} buttons, dialogs: ${[...new Set(dialogs)].slice(0, 6).join(' / ')}`);
    });
}

test('shop works with the keyboard only: add an item, open the cart, switch category', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    const add = page.getByRole('button', { name: 'Add Masala Papad to cart' });
    await add.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press(' ');
    await expect(page.locator('.cart-floating-bar')).toContainText('2 Items');
    await page.locator('.cart-floating-bar').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.cart-item')).toHaveCount(1);
    expect(errors).toEqual([]);
});
