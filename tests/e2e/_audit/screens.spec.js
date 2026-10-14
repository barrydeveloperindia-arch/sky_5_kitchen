import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';
import { openAdmin } from '../helpers';

// On-demand screen audit: every screen at phone / tablet / PC sizes (portrait and sideways).
// Saves a screenshot of each and a JSON of contrast problems + sideways scroll, for a person to look at.
//   SCREENS_OUT=<folder> npx playwright test tests/e2e/_audit/screens.spec.js --project=desktop
test.skip(!process.env.SCREENS_OUT, 'screen audit runs on demand only');
const OUT = process.env.SCREENS_OUT;

const SIZES = [
    ['phone-small', 360, 740], ['phone-big', 412, 915], ['phone-sideways', 740, 360],
    ['tablet', 768, 1024], ['tablet-sideways', 1024, 768], ['laptop', 1280, 800], ['pc', 1440, 900],
];
const OPS_TABS = ['today', 'reception', 'kitchen', 'cleaning', 'laundry', 'checkouts', 'inventory', 'workforce', 'attendance', 'finance', 'menu config'];
const results = {};

async function scan(page, name) {
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    // text that runs past the edge of a box that hides overflow (cut off), except deliberate "…" truncation
    const clipped = await page.evaluate(() => {
        const out = [];
        const hides = (el) => { const cs = getComputedStyle(el); return ['hidden', 'clip'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflow); };
        for (const el of document.querySelectorAll('body *')) {
            if (!el.childNodes.length || [...el.childNodes].every(n => n.nodeType !== 3 || !n.textContent.trim())) continue;
            const cs = getComputedStyle(el);
            if (cs.textOverflow === 'ellipsis' || cs.visibility === 'hidden' || cs.display === 'none') continue;
            const r = el.getBoundingClientRect();
            if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
            if (el.scrollWidth > el.clientWidth + 1 && hides(el)) { out.push((el.textContent || '').trim().slice(0, 40)); continue; }
            // walk up to the first box that scrolls (fine: the person can scroll) or hides (cut off)
            let p = el.parentElement, scrolls = false;
            while (p && p !== document.body) {
                const sc = getComputedStyle(p);
                if (['auto', 'scroll'].includes(sc.overflowX)) { scrolls = true; break; }
                if (hides(p)) break;
                p = p.parentElement;
            }
            if (scrolls || !p || p === document.body) continue;
            const pr = p.getBoundingClientRect();
            if (r.right > pr.right + 1 || r.left < pr.left - 1) out.push((el.textContent || '').trim().slice(0, 40));
        }
        return [...new Set(out)].slice(0, 15);
    });
    results[name] = { overflow, clipped, violations: axe.violations.map(v => ({ id: v.id, count: v.nodes.length, sample: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })) };
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

test.afterAll(() => { fs.writeFileSync(path.join(OUT, 'screens.json'), JSON.stringify(results, null, 2)); });

for (const [label, width, height] of SIZES) {
    test(`screens at ${label}`, async ({ browser }) => {
        test.setTimeout(300000);
        const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 1024,
            permissions: ['geolocation'], geolocation: { latitude: 30.72135, longitude: 76.85260, accuracy: 15 } });
        const page = await ctx.newPage();
        await page.addInitScript(() => { window.open = () => ({ document: { write() {}, close() {} } }); window.print = () => {}; });
        await page.goto('/');
        await expect(page.locator('.modern-item-card').first()).toBeVisible();
        await scan(page, `${label}--shop`);
        await openAdmin(page);
        for (const tab of OPS_TABS) {
            const nav = page.getByTestId(`nav-${tab}`);
            if (!(await nav.isVisible())) {   // phone: the OPS menu is behind the menu button
                const menu = page.getByRole('button', { name: /menu/i }).first();
                if (await menu.isVisible()) await menu.click();
            }
            if (!(await nav.isVisible())) continue;
            await nav.click();
            await page.waitForTimeout(600);
            await scan(page, `${label}--ops-${tab.replace(/ /g, '-')}`);
        }
        await page.goto('/attendance');
        await page.waitForTimeout(800);
        await scan(page, `${label}--attendance-pick`);
        const first = page.locator('[data-testid^="att-pick-"]').first();
        if (await first.isVisible()) {
            await first.click();
            await page.waitForTimeout(500);
            await scan(page, `${label}--attendance-home`);
        }
        await ctx.close();
    });
}
