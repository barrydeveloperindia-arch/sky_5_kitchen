import { test, expect } from '@playwright/test';
import { trackErrors } from './helpers';
import { SOAP, setupInventoryTest, openStaffPage, addEntry, row } from './inventoryHelpers';

// Staff page (/inventory) — runs on both desktop and the phone (Pixel 7) project.

let errors;
test.beforeEach(async ({ page, context, request }, testInfo) => {
    errors = trackErrors(page);
    await setupInventoryTest({ page, context, request }, testInfo);
    await openStaffPage(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('fits the screen: no sideways scrolling', async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
});

test('tabs: Entry / Stock / History each show their screen', async ({ page }) => {
    await expect(page.getByTestId('inv-save')).toBeVisible();
    await page.getByTestId('inv-tab-stock').click();
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(70);
    await page.getByTestId('inv-tab-history').click();
    await expect(page.getByText('No entries yet.')).toBeVisible();
    await page.getByTestId('inv-tab-entry').click();
    await expect(page.getByTestId('inv-save')).toBeVisible();
});

test('stock tab: search, category and status filters', async ({ page }) => {
    await page.getByTestId('inv-tab-stock').click();
    await page.getByTestId('inv-search').fill('broom');
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(2);
    await page.getByTestId('inv-search').fill('');
    await page.getByTestId('inv-category').selectOption('Fuel / Gas');
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(2);
    await page.getByTestId('inv-category').selectOption('All');
    await page.getByTestId('inv-status').selectOption('REFILL');
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(1);
});

test('history: staff can delete their own wrong entry', async ({ page }) => {
    await addEntry(page, { code: SOAP, type: 'OUT', qty: 5, by: 'Veerwati' });
    await expect(page.getByTestId('inv-notice')).toBeVisible();
    await page.getByTestId('inv-tab-history').click();
    await expect(page.locator('.inv-hist-item')).toHaveCount(1);
    await page.getByTestId('inv-delete').click();
    await expect(page.getByText('No entries yet.')).toBeVisible();
    await page.getByTestId('inv-tab-stock').click();
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('120');
});

test('KPI tiles open their lists on the phone too', async ({ page }) => {
    await page.getByTestId('inv-kpi-total').click();
    await expect(page.getByTestId('inv-viewer').locator('[data-testid^="inv-viewer-row-"]')).toHaveCount(70);
    await page.getByTestId('inv-viewer-close').click();
    await page.getByTestId('inv-share-pdf').click();
    await expect(page.getByTestId('inv-pdf-download')).toBeVisible();
    await page.getByTestId('inv-viewer-close').click();
});

test('stock tab: location lists on the phone', async ({ page }) => {
    await page.getByTestId('inv-tab-stock').click();
    await expect(page.getByTestId(`inv-row-${SOAP}`)).toContainText('Kitchen 70 · Basement 50');
    await page.getByTestId('inv-loc-basement').click();
    await expect(page.getByTestId('inv-location-list').locator('tbody tr')).toHaveCount(41);
    await page.getByTestId('inv-loc-kitchen').click();
    await expect(page.getByTestId('inv-location-list').locator('tbody tr')).toHaveCount(38);
});
