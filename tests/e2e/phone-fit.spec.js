import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin } from './helpers';

// Phone width (390px): no screen may push content off the right edge. Wide tables are allowed
// only inside a sideways-scrolling box (overflow-x auto/scroll), never cut off.
test.skip(({ isMobile }) => isMobile, 'sets its own phone viewport');
test.describe.configure({ timeout: 120000 });

async function offscreen(page) {
    return page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const scrollsX = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') return true; if (o === 'hidden' || o === 'clip') return 'clipped'; } return false; };
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.position === 'fixed' && r.right <= W + 1) continue;
            if (r.right > W + 1 || r.left < -1) {
                const s = scrollsX(el);
                if (s === true) continue;
                // text cut off by a clipping parent is also a bug, unless it is an image / decoration
                if (el.closest('[aria-hidden="true"], [role="progressbar"]') || el.tagName === 'IMG' || el.tagName === 'svg' || el.closest('svg')) continue;
                out.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''} "${(el.innerText || '').trim().slice(0, 30)}" right=${Math.round(r.right)}${s === 'clipped' ? ' (clipped)' : ''}`);
            }
        }
        // report only outermost offenders
        return { docOverflow: document.documentElement.scrollWidth - W, items: out.slice(0, 8) };
    });
}

test('phone: shop home, cart, payment, invoice, menu card fit the screen', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = trackErrors(page);
    await stubWindowOpen(page);
    const found = {};
    await page.goto('/');
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    found.home = await offscreen(page);
    await page.getByRole('button', { name: 'Add Masala Papad to cart' }).click();
    await page.locator('.cart-floating-bar').click();
    await page.waitForTimeout(500);
    found.cart = await offscreen(page);
    await page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    found.payment = await offscreen(page);
    await page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Table 3');
    await page.getByRole('button', { name: 'PLACE ORDER' }).click();
    await expect(page.locator('#invoice-sheet')).toBeVisible();
    found.invoice = await offscreen(page);
    await ctx.close();
    for (const [k, v] of Object.entries(found)) expect(v, `${k}: ${JSON.stringify(v)}`).toEqual({ docOverflow: 0, items: [] });
    expect(errors).toEqual([]);
});

test('phone: staff inventory (entry, stock, history, location lists) fits the screen', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await stubWindowOpen(page);
    await page.goto('/inventory');
    await expect(page.getByTestId('inventory-view')).toBeVisible({ timeout: 20000 });
    const found = { entry: await offscreen(page) };
    await page.getByTestId('inv-tab-stock').click();
    found.stock = await offscreen(page);
    await page.getByTestId('inv-loc-basement').click();
    found.basement = await offscreen(page);
    await page.getByTestId('inv-tab-history').click();
    found.history = await offscreen(page);
    await page.getByTestId('inv-kpi-total').click();
    found.viewer = await offscreen(page);
    await ctx.close();
    for (const [k, v] of Object.entries(found)) expect(v, `${k}: ${JSON.stringify(v)}`).toEqual({ docOverflow: 0, items: [] });
});

test('phone: every OPS Center tab fits the screen', async ({ page }) => {
    await stubWindowOpen(page);
    await openAdmin(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const found = {};
    for (const t of ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu-config']) {
        await page.getByTestId(`nav-${t}`).click();
        await page.waitForTimeout(400);
        found[t] = await offscreen(page);
    }
    for (const [k, v] of Object.entries(found)) expect(v, `${k}: ${JSON.stringify(v)}`).toEqual({ docOverflow: 0, items: [] });
});
