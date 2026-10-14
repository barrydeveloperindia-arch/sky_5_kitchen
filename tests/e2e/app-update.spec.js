import { test, expect } from '@playwright/test';
import { openAdmin } from './helpers';

// A phone or PC that kept the app open while a new version went live asks for screen files that no longer
// exist. The app then reloads once by itself and opens the new version, instead of showing a broken screen.
test.skip(({ isMobile }) => isMobile, 'once is enough');

test('OPS Center file missing after an update: the app reloads once and opens normally', async ({ page }) => {
    let failed = 0;
    await page.route(/components\/AdminDashboard\.jsx/, (route) => {
        if (failed === 0) { failed++; return route.abort(); }
        return route.continue();
    });
    const loads = [];
    page.on('load', () => loads.push(Date.now()));
    await page.goto('/');
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await page.getByText('Admin', { exact: true }).filter({ visible: true }).first().click();
    // the reload brings back the shop (the start page); opening the OPS Center now works
    await expect.poll(() => loads.length).toBeGreaterThanOrEqual(2);
    expect(failed).toBe(1);
    await openAdmin(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reception Dashboard');
});

test('the staff page file missing after an update: reload once, the name list shows', async ({ page }) => {
    let failed = 0;
    await page.route(/components\/StaffAttendance\.jsx/, (route) => {
        if (failed === 0) { failed++; return route.abort(); }
        return route.continue();
    });
    await openAdmin(page);   // staff list written once
    await page.waitForTimeout(1500);
    await page.goto('/attendance');
    await expect(page.getByTestId('staff-attendance')).toBeVisible({ timeout: 15000 });
    expect(failed).toBe(1);
});
