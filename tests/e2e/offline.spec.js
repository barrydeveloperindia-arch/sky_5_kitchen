import { test, expect } from '@playwright/test';
import { trackErrors, openAdmin, waitSaved } from './helpers';
import { SOAP, setupInventoryTest, applyEmulatorProject, openStaffPage, openInventory, addEntry, row } from './inventoryHelpers';

// Staff lose Wi-Fi in the basement: entries must be kept, clearly marked offline, and sync later.
test.skip(({ isMobile }) => isMobile, 'uses a second desktop device');

const ignoreOffline = (errors) => errors.filter(e => !/ERR_INTERNET_DISCONNECTED|offline|net::/i.test(e));

test('inventory entry made offline is marked offline, then syncs to other devices', async ({ page, context, request, browser }, testInfo) => {
    const project = await setupInventoryTest({ page, context, request }, testInfo);
    const errors = trackErrors(page);
    await openStaffPage(page);
    await expect(page.getByTestId('inv-live')).toContainText('Live');

    await context.setOffline(true);
    await expect(page.getByTestId('inv-live')).toContainText('Offline');
    await addEntry(page, { code: SOAP, type: 'OUT', qty: 5, party: 'Room 3' });
    await expect(page.getByTestId('inv-notice')).toContainText('saved on this device', { timeout: 10000 });

    await context.setOffline(false);
    await expect(page.getByTestId('inv-live')).toContainText('Live · synced');

    const ctx2 = await browser.newContext();
    await applyEmulatorProject(ctx2, project);
    const other = await ctx2.newPage();
    await openInventory(other);
    await expect(row(other, SOAP).getByTestId('inv-current')).toHaveText('115', { timeout: 20000 });
    await ctx2.close();
    expect(ignoreOffline(errors)).toEqual([]);
});

test('OPS Center shows "Offline · will sync" and a check-in made offline reaches the database later', async ({ page, context, browser }) => {
    const errors = trackErrors(page);
    await openAdmin(page);
    await waitSaved(page);
    await context.setOffline(true);
    await expect(page.getByTestId('admin-live')).toHaveText('Offline · will sync');
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('Offline Guest');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await expect(page.getByTestId('room-card-2')).toContainText('Offline Guest');

    await context.setOffline(false);
    await waitSaved(page);
    const project = await page.evaluate(() => localStorage.getItem('sky5_emu_project'));
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await applyEmulatorProject(ctx2, project);
    const other = await ctx2.newPage();
    await openAdmin(other);
    await expect(other.getByTestId('room-card-2')).toContainText('Offline Guest', { timeout: 20000 });
    await ctx2.close();
    expect(ignoreOffline(errors)).toEqual([]);
});
