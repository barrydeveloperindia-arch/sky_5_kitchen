import { test } from '@playwright/test';
import { openAdmin, stubWindowOpen } from '../helpers';
test.skip(!process.env.AUDIT_OUT, 'on demand');
test('phone overflow per admin tab', async ({ page }) => {
    await stubWindowOpen(page);
    await openAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const t of ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu-config']) {
        await page.getByTestId(`nav-${t}`).click();
        await page.waitForTimeout(300);
        const r = await page.evaluate(() => {
            const o = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const wide = [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(e).position !== 'fixed')
                .filter(e => !e.closest('[data-scrollx]')).slice(0, 4).map(e => `${e.tagName}.${String(e.className).slice(0, 40)} w=${Math.round(e.getBoundingClientRect().width)} ${e.getAttribute('style')?.slice(0, 80) || ''}`);
            return { o, wide };
        });
        console.log(t, JSON.stringify(r));
    }
});
