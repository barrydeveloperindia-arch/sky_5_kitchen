import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openAdmin, adminTab } from '../helpers';

// On-demand helper: which element fails "scrollable region must be keyboard reachable", and how tables scroll.
test.skip(!process.env.PROBE, 'on demand');
test('probe finance', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openAdmin(page);
    await adminTab(page, 'finance');
    await page.waitForTimeout(800);
    const a = await new AxeBuilder({ page }).withRules(['scrollable-region-focusable']).analyze();
    for (const v of a.violations) for (const n of v.nodes) console.log('NODE', n.target.join(' '), n.html.slice(0, 120));
    console.log('INFO', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[data-slot=table-container]')].map(e => ({
        ox: getComputedStyle(e).overflowX, region: e.closest('[role=region]')?.getAttribute('aria-label') || null,
        sw: e.scrollWidth, cw: e.clientWidth, parent: e.parentElement.className.slice(0, 80) })))));
});
