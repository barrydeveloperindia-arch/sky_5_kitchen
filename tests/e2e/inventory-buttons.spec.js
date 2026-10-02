import { test, expect } from '@playwright/test';
import { trackErrors } from './helpers';
import { SOAP, WATER, setupInventoryTest, openInventory, pickItem, row } from './inventoryHelpers';

// Remaining inventory controls on the admin screen (runs on the Firebase emulator).
test.skip(({ isMobile }) => isMobile, 'admin screen');

let errors;
test.beforeEach(async ({ page, context, request }, testInfo) => {
    errors = trackErrors(page);
    await setupInventoryTest({ page, context, request }, testInfo);
    await openInventory(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('every entry field is saved: date, location, supplier, remarks', async ({ page }) => {
    await pickItem(page, SOAP);
    await page.getByTestId('inv-type-IN').click();
    await page.getByTestId('inv-qty').fill('24');
    await page.getByTestId('inv-date').fill('2026-09-28');
    await page.getByTestId('inv-location').selectOption('Kitchen (Upar)');
    await expect(page.getByText('Supplier', { exact: true })).toBeVisible();
    await page.getByTestId('inv-party').fill('Gupta Traders');
    await page.getByTestId('inv-by').fill('Gaurav Panchal');
    await page.getByTestId('inv-remarks').fill('Bill #221');
    await page.getByTestId('inv-save').click();
    const reg = page.getByTestId('inv-register').locator('tbody tr').first();
    await expect(reg).toContainText('28-09-2026');
    await expect(reg).toContainText('IN');
    await expect(reg).toContainText('24 Pcs');
    await expect(reg).toContainText('Kitchen (Upar)');
    await expect(reg).toContainText('Gupta Traders');
    await expect(reg).toContainText('Gaurav Panchal');
    await expect(reg).toContainText('Bill #221');
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('144');
    // today's KPI counts only today's entries
    await expect(page.getByTestId('inv-kpi-today')).toContainText('0');
});

test('item picker: search by name or code, "no item found", change item', async ({ page }) => {
    await page.getByTestId('inv-item-search').fill('zzzz');
    await expect(page.getByText('No item found')).toBeVisible();
    await page.getByTestId('inv-item-search').fill('SKY-CU');
    await expect(page.locator('[data-testid^="inv-item-option-"]')).toHaveCount(3);
    await page.getByTestId('inv-item-option-SKY-CU-003').click();
    await expect(page.getByTestId('inv-item-selected')).toContainText('Spoon');
    await page.getByTestId('inv-item-selected').getByRole('button', { name: 'Change item' }).click();
    await expect(page.getByTestId('inv-item-search')).toBeVisible();
});

test('qty stepper never goes below 0', async ({ page }) => {
    await page.getByTestId('inv-qty-minus').click();
    await expect(page.getByTestId('inv-qty')).toHaveValue('0');
    await page.getByTestId('inv-qty-plus').click();
    await expect(page.getByTestId('inv-qty')).toHaveValue('1');
});

test('condition dropdown: marking an item EXPIRED / EMPTY / Good updates status', async ({ page }) => {
    const soapRow = row(page, SOAP);
    await soapRow.locator('select').selectOption('EXPIRED');
    await expect(soapRow.getByTestId('inv-status-badge')).toHaveText('EXPIRED');
    await expect(page.getByTestId('inv-kpi-alerts')).toContainText('3');
    await soapRow.locator('select').selectOption('EMPTY');
    await expect(soapRow.getByTestId('inv-status-badge')).toHaveText('REFILL');
    await soapRow.locator('select').selectOption('Good');
    await expect(soapRow.getByTestId('inv-status-badge')).toHaveText('OK');
    await row(page, WATER).locator('select').selectOption('Good');
    await expect(row(page, WATER).getByTestId('inv-status-badge')).toHaveText('OK');
});

test('Min. Level: saved on Enter; clearing the box keeps the saved value; retyping gives exactly what was typed', async ({ page }) => {
    const min = row(page, SOAP).getByTestId('inv-min');
    await min.fill('500');
    await min.press('Enter');
    await expect(row(page, SOAP).getByTestId('inv-status-badge')).toHaveText('REORDER');
    await min.fill('');
    await min.press('Tab');
    await expect(min).toHaveValue('500');
    // old bug: clearing re-showed "1", so typing 5 produced 15
    await min.fill('');
    await min.pressSequentially('5');
    await min.press('Enter');
    await expect(min).toHaveValue('5');
    await expect(row(page, SOAP).getByTestId('inv-status-badge')).toHaveText('OK');
});

test('report viewer: Print prints the report frame; backdrop click and ✕ close it', async ({ page }) => {
    await page.getByTestId('inv-share-pdf').click();
    const frame = page.frameLocator('[data-testid="inv-report-frame"]');
    await expect(frame.getByText('Inventory Report')).toBeVisible();
    await page.locator('[data-testid="inv-report-frame"]').evaluate(f => { f.contentWindow.print = () => { window.__framePrinted = true; }; });
    await page.getByTestId('inv-pdf-print').click();
    expect(await page.evaluate(() => window.__framePrinted)).toBe(true);
    await page.mouse.click(5, 5);
    await expect(page.getByTestId('inv-viewer')).toHaveCount(0);
});

test('KPI "Reorder now" list matches the status column exactly', async ({ page }) => {
    await page.getByTestId('inv-status').selectOption('REORDER');
    const codes = await page.locator('[data-testid^="inv-row-"]').evaluateAll(els => els.map(e => e.dataset.testid.replace('inv-row-', '')));
    await page.getByTestId('inv-kpi-reorder').click();
    const listed = await page.locator('[data-testid^="inv-viewer-row-"]').evaluateAll(els => els.map(e => e.dataset.testid.replace('inv-viewer-row-', '')));
    expect(listed.sort()).toEqual(codes.sort());
});

test('stock table shows Kitchen and Basement separately; OUT only reduces its own location', async ({ page }) => {
    const soap = row(page, SOAP);
    await expect(soap.getByTestId('inv-at-kitchen')).toHaveText('70');
    await expect(soap.getByTestId('inv-at-basement')).toHaveText('50');
    await expect(soap.getByTestId('inv-current')).toHaveText('120');
    await pickItem(page, SOAP);
    await expect(page.getByTestId('inv-item-selected')).toContainText('Kitchen 70 · Basement 50');
    await page.getByTestId('inv-type-OUT').click();
    await page.getByTestId('inv-location').selectOption('Kitchen (Upar)');
    await page.getByTestId('inv-qty').fill('71');
    await page.getByTestId('inv-by').fill('Varun');
    await page.getByTestId('inv-save').click();
    await expect(page.getByTestId('inv-error')).toHaveText(/Only 70 Pcs in Kitchen \(Upar\)\./);
    await page.getByTestId('inv-qty').fill('20');
    await page.getByTestId('inv-save').click();
    await expect(soap.getByTestId('inv-at-kitchen')).toHaveText('50');
    await expect(soap.getByTestId('inv-at-basement')).toHaveText('50');
    await expect(soap.getByTestId('inv-current')).toHaveText('100');
});

test('MOVE (transfer) Basement -> Kitchen keeps the total and shows in the register', async ({ page }) => {
    await pickItem(page, SOAP);
    await page.getByTestId('inv-type-TRANSFER').click();
    await expect(page.getByTestId('inv-party')).toHaveCount(0);
    await page.getByTestId('inv-location').selectOption('Basement Store');
    await expect(page.getByTestId('inv-to-location')).toHaveValue('Kitchen (Upar)');
    await page.getByTestId('inv-qty').fill('30');
    await page.getByTestId('inv-by').fill('Amresh Kumar');
    await page.getByTestId('inv-save').click();
    await expect(page.getByTestId('inv-notice')).toContainText('TRANSFER 30 Pcs Basement Store → Kitchen (Upar) - Hotel Soap saved');
    const soap = row(page, SOAP);
    await expect(soap.getByTestId('inv-at-kitchen')).toHaveText('100');
    await expect(soap.getByTestId('inv-at-basement')).toHaveText('20');
    await expect(soap.getByTestId('inv-current')).toHaveText('120');
    await expect(page.getByTestId('inv-register').locator('tbody tr').first()).toContainText('Basement Store → Kitchen (Upar)');
    // cannot move more than is left in the basement
    await pickItem(page, SOAP);
    await page.getByTestId('inv-type-TRANSFER').click();
    await page.getByTestId('inv-qty').fill('21');
    await page.getByTestId('inv-save').click();
    await expect(page.getByTestId('inv-error')).toHaveText(/Only 20 Pcs in Basement Store\./);
});

test('location lists: Kitchen and Basement registers in Sr. No. order with counted and live quantity', async ({ page }) => {
    await page.getByTestId('inv-loc-kitchen').click();
    const list = page.getByTestId('inv-location-list');
    await expect(list).toContainText('Kitchen (Upar)');
    await expect(list).toContainText('counted 23-09-2026');
    await expect(list.locator('[data-testid^="inv-list-row-0-"]')).toHaveCount(18);
    await expect(list.locator('[data-testid^="inv-list-row-1-"]')).toHaveCount(20);
    const first = list.getByTestId('inv-list-row-0-1');
    await expect(first).toContainText('Napkin');
    await expect(first).toContainText('Nepkin');
    await expect(list.getByTestId('inv-list-row-1-12')).toContainText('Quarter Plate');
    await expect(list.getByTestId('inv-list-row-0-3').getByTestId('inv-list-now')).toHaveText('70'); // Hotel Soap kitchen

    await page.getByTestId('inv-loc-basement').click();
    await expect(list).toContainText('counted 29-09-2026');
    await expect(list.locator('[data-testid^="inv-list-row-0-"]')).toHaveCount(0);
    await expect(list.locator('tbody tr')).toHaveCount(41);
    await expect(list.getByTestId('inv-list-row-2-38')).toContainText('Water Bottle (250 ml)');
    await expect(list.getByTestId('inv-list-row-2-38')).toContainText('EXPIRED');
    await expect(list.getByTestId('inv-list-row-2-12').getByTestId('inv-list-now')).toHaveText('50'); // Hotel Soap basement

    await page.getByTestId('inv-loc-all').click();
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(70);
});

test('PDF report and WhatsApp include both location lists', async ({ page }) => {
    await page.getByTestId('inv-share-pdf').click();
    const frame = page.frameLocator('[data-testid="inv-report-frame"]');
    await expect(frame.getByText('Kitchen (Upar) - register list')).toBeVisible();
    await expect(frame.getByText('Basement Store - register list')).toBeVisible();
    await expect(frame.locator('tr.loc-row')).toHaveCount(79);
    await page.getByTestId('inv-viewer-close').click();
    await page.getByTestId('inv-share-whatsapp').click();
    const wa = (await page.evaluate(() => window.__opened)).find(u => typeof u === 'string' && u.startsWith('https://wa.me/'));
    const text = decodeURIComponent(wa.split('text=')[1]);
    expect(text).toContain('*KITCHEN (UPAR) - REGISTER LIST (counted / now)*');
    expect(text).toContain('*BASEMENT STORE - REGISTER LIST (counted / now)*');
    expect(text).toContain('3. Hotel Soap: 70 / 70 Pcs');
    expect(text).toContain('12. Hotel Soap: 50 / 50 Pcs');
});
