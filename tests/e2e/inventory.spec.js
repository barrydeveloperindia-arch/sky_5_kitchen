import { test, expect } from '@playwright/test';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { trackErrors } from './helpers';
import { inventoryItems, LOCATIONS } from '../../02_Application_Source/data/inventory';
import { SOAP, WATER, setupInventoryTest, applyEmulatorProject, openInventory, pickItem, addEntry, row } from './inventoryHelpers';

let EMU_PROJECT;

test.beforeEach(async ({ page, context, request }, testInfo) => {
    EMU_PROJECT = await setupInventoryTest({ page, context, request }, testInfo);
});

test('opens straight away (no PIN) with 70 items, default Min. Level 1 and known alerts', async ({ page }) => {
    const errors = trackErrors(page);
    await openInventory(page);
    await expect(page.getByTestId('pin-gate')).toHaveCount(0);
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(70);
    await expect(page.getByTestId('inv-kpi-total')).toContainText('70');
    await expect(page.getByTestId('inv-kpi-alerts')).toContainText('2');
    await expect(page.getByTestId('inv-kpi-today')).toContainText('0');
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('120');
    await expect(row(page, SOAP).getByTestId('inv-min')).toHaveValue('1');
    await expect(row(page, WATER).getByTestId('inv-status-badge')).toHaveText('EXPIRED');
    await expect(page.getByTestId('inv-live')).toContainText('Live');
    expect(errors).toEqual([]);
});

test('entry made on the staff phone appears live on the admin screen', async ({ page, browser }) => {
    await openInventory(page);

    const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await applyEmulatorProject(phoneCtx, EMU_PROJECT);
    const phone = await phoneCtx.newPage();
    await phone.goto('/inventory');
    await expect(phone.getByText('Hotel Sky 5 · Staff stock entry')).toBeVisible();
    await expect(phone.getByTestId('inventory-view')).toBeVisible({ timeout: 20000 });

    // Staff page: entry tab by default, no admin-only controls, no OPS Center
    await expect(phone.getByTestId('inv-export-stock')).toHaveCount(0);
    await expect(phone.getByTestId('inv-min')).toHaveCount(0);
    await expect(phone.getByText('OPS CENTER')).toHaveCount(0);

    // Item search + stepper on the phone
    await pickItem(phone, 'soap');
    await expect(phone.getByTestId('inv-item-selected')).toContainText('Hotel Soap');
    await phone.getByTestId('inv-type-OUT').click();
    for (let i = 0; i < 3; i++) await phone.getByTestId('inv-qty-plus').click();
    await phone.getByTestId('inv-qty-minus').click();
    await expect(phone.getByTestId('inv-qty')).toHaveValue('2');
    await phone.getByTestId('inv-qty').fill('25');
    await phone.getByTestId('inv-party').fill('Housekeeping 3rd floor');
    await phone.getByTestId('inv-by').fill('Veerwati');
    await phone.getByTestId('inv-save').click();
    await expect(phone.getByTestId('inv-notice')).toContainText('OUT 25 Pcs - Hotel Soap saved');

    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('95', { timeout: 10000 });
    await expect(page.getByTestId('inv-register')).toContainText('Veerwati');
    await expect(page.getByTestId('inv-kpi-today')).toContainText('1');

    // Admin raises Min. Level -> phone Stock tab shows REORDER
    await row(page, SOAP).getByTestId('inv-min').fill('100');
    await row(page, SOAP).getByTestId('inv-min').press('Enter');
    await phone.getByTestId('inv-tab-stock').click();
    await expect(row(phone, SOAP).getByTestId('inv-status-badge')).toHaveText('REORDER', { timeout: 10000 });
    await expect(row(phone, SOAP).getByTestId('inv-current')).toHaveText('95');

    // Name is remembered on the device; data survives reload (server-side)
    await phone.reload();
    await expect(phone.getByTestId('inv-by')).toHaveValue('Veerwati', { timeout: 20000 });
    await phone.getByTestId('inv-tab-history').click();
    await expect(phone.getByTestId('inv-register')).toContainText('OUT 25 Pcs');
    await phoneCtx.close();
});

test('delete hides the entry and restores stock, but the record stays in the database', async ({ page, request }) => {
    await openInventory(page);
    await addEntry(page, { code: SOAP, type: 'OUT', qty: 25 });
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('95');
    await addEntry(page, { code: SOAP, type: 'IN', qty: 5, party: 'Local vendor' });
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('100');
    await expect(page.getByTestId('inv-register').locator('tbody tr')).toHaveCount(2);
    await page.getByTestId('inv-delete').first().click();
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('95');
    await expect(page.getByTestId('inv-register').locator('tbody tr')).toHaveCount(1);

    // the soft-delete reaches the database a moment after the screen updates
    const docs = async () => {
        const res = await request.get(`http://127.0.0.1:8181/v1/projects/${EMU_PROJECT}/databases/(default)/documents/inventory_transactions`, { headers: { Authorization: 'Bearer owner' } });
        return (await res.json()).documents || [];
    };
    await expect.poll(async () => (await docs()).filter(d => d.fields.deleted?.booleanValue === true).length, { timeout: 10000 }).toBe(1);
    expect(await docs()).toHaveLength(2);
});

test('validation: cannot issue more than stock, qty/name/item required', async ({ page }) => {
    await openInventory(page);
    await addEntry(page, { code: SOAP, type: 'OUT', qty: 500 });
    await expect(page.getByTestId('inv-error')).toContainText('Only 50 Pcs in Basement Store.');
    await page.getByTestId('inv-qty').fill('0');
    await page.getByTestId('inv-save').click();
    await expect(page.getByTestId('inv-error')).toContainText('more than 0');
    await page.getByTestId('inv-qty').fill('3');
    await page.getByTestId('inv-by').fill('');
    await page.getByTestId('inv-save').click();
    await expect(page.getByTestId('inv-error')).toContainText('who made the entry');
    await page.getByTestId('inv-item-selected').getByRole('button', { name: 'Change item' }).click();
    await page.getByTestId('inv-by').fill('X');
    await page.getByTestId('inv-save').click();
    await expect(page.getByTestId('inv-error')).toContainText('Select an item');
    await expect(page.getByText('No entries yet.')).toBeVisible();
});

test('Min. Level drives REORDER / OK and the Reorder KPI', async ({ page }) => {
    await openInventory(page);
    const kpi = async () => Number((await page.getByTestId('inv-kpi-reorder').innerText()).match(/\d+/)[0]);
    await expect(row(page, SOAP).getByTestId('inv-status-badge')).toHaveText('OK');
    const base = await kpi();
    expect(base).toBeGreaterThan(0);
    await row(page, SOAP).getByTestId('inv-min').fill('150');
    await row(page, SOAP).getByTestId('inv-min').press('Enter');
    await expect(row(page, SOAP).getByTestId('inv-status-badge')).toHaveText('REORDER');
    await expect.poll(kpi).toBe(base + 1);
    await row(page, SOAP).getByTestId('inv-min').fill('50');
    await row(page, SOAP).getByTestId('inv-min').press('Enter');
    await expect(row(page, SOAP).getByTestId('inv-status-badge')).toHaveText('OK');
    await expect.poll(kpi).toBe(base);
});

test('share: PDF report and WhatsApp carry full per-item detail', async ({ page }) => {
    await openInventory(page);
    await addEntry(page, { code: SOAP, type: 'OUT', qty: 10, party: 'Room 5, 7' });
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('110');

    // PDF Report opens inside the app (no pop-up), then downloads a real PDF file
    await page.getByTestId('inv-share-pdf').click();
    const viewer = page.getByTestId('inv-viewer');
    await expect(viewer).toBeVisible();
    const frame = page.frameLocator('[data-testid="inv-report-frame"]');
    await expect(frame.getByText('Full stock (70 items)')).toBeVisible();
    await expect(frame.getByText('Room 5, 7')).toBeVisible();
    await expect(frame.locator('td.mono')).toHaveCount(70);
    const [pdfDl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('inv-pdf-download').click()]);
    expect(pdfDl.suggestedFilename()).toMatch(/^HotelSky5_Inventory_\d{4}-\d{2}-\d{2}\.pdf$/);
    const pdf = fs.readFileSync(await pdfDl.path());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(20000);
    // read the PDF text: every item code, both location registers and the summary must be inside
    const pdfText = execFileSync('python', ['-c', 'import sys,pypdf; r=pypdf.PdfReader(sys.argv[1]); print(len(r.pages)); print("\\n".join(p.extract_text() for p in r.pages))', await pdfDl.path()]).toString();
    const missingCodes = inventoryItems.map(i => i.code).filter(c => !pdfText.includes(c));
    expect(missingCodes, 'item codes missing from the PDF').toEqual([]);
    for (const loc of LOCATIONS) expect(pdfText).toContain(loc);
    expect(pdfText).not.toMatch(/NaN|undefined/);
    await expect(page.getByTestId('inv-pdf-msg')).toContainText('Saved: HotelSky5_Inventory_');
    await page.getByTestId('inv-viewer-close').click();
    await expect(viewer).toHaveCount(0);

    await page.getByTestId('inv-share-whatsapp').click();
    const wa = (await page.evaluate(() => window.__opened)).find(u => typeof u === 'string' && u.startsWith('https://wa.me/'));
    const text = decodeURIComponent(wa.split('text=')[1]);
    expect(text).toContain('*HOTEL SKY 5 - INVENTORY REPORT*');
    expect(text).toContain(`${SOAP} Hotel Soap: 110 Pcs`);
    expect(text.match(/^SKY-[A-Z]{2}-\d{3} /gm)).toHaveLength(70);
    expect(text).toContain('/inventory');
});

test('KPI tiles open their full list', async ({ page }) => {
    await openInventory(page);
    await page.getByTestId('inv-kpi-reorder').click();
    const viewer = page.getByTestId('inv-viewer');
    await expect(viewer).toContainText('Reorder now (7)');
    await expect(viewer.locator('[data-testid^="inv-viewer-row-"]')).toHaveCount(7);
    await expect(viewer).toContainText('Duster Towel');
    await page.getByTestId('inv-viewer-close').click();

    await page.getByTestId('inv-kpi-alerts').click();
    await expect(viewer.locator('[data-testid^="inv-viewer-row-"]')).toHaveCount(2);
    await expect(viewer).toContainText('Water Bottle (250 ml)');
    await page.keyboard.press('Escape'); // Esc closes
    await expect(viewer).toHaveCount(0);
    await page.getByTestId('inv-kpi-alerts').click();
    await expect(viewer).toBeVisible();
    await page.mouse.click(5, 5); // click outside closes
    await expect(viewer).toHaveCount(0);

    await page.getByTestId('inv-kpi-total').click();
    await expect(viewer.locator('[data-testid^="inv-viewer-row-"]')).toHaveCount(70);
    await page.getByTestId('inv-viewer-close').click();

    await page.getByTestId('inv-kpi-today').click();
    await expect(viewer).toContainText('No entries today yet.');
    await page.getByTestId('inv-viewer-close').click();
    await addEntry(page, { code: SOAP, type: 'OUT', qty: 4, party: 'Room 12' });
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('116');
    await page.getByTestId('inv-kpi-today').click();
    await expect(viewer.getByTestId('inv-viewer-entry')).toHaveCount(1);
    await expect(viewer).toContainText('OUT 4 Pcs');
});

test('filters, Excel export, and save button not sticky', async ({ page }) => {
    await openInventory(page);
    await page.getByTestId('inv-search').fill('soap');
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(1);
    await page.getByTestId('inv-search').fill('');
    await page.getByTestId('inv-category').selectOption('Cutlery');
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(3);
    await page.getByTestId('inv-category').selectOption('All');
    await page.getByTestId('inv-status').selectOption('EXPIRED');
    await expect(page.locator('[data-testid^="inv-row-"]')).toHaveCount(1);
    await page.getByTestId('inv-status').selectOption('All');

    await addEntry(page, { code: SOAP, type: 'OUT', qty: 10, party: 'Room 5, 7' });
    await expect(row(page, SOAP).getByTestId('inv-current')).toHaveText('110');
    const [stockDl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('inv-export-stock').click()]);
    const stock = fs.readFileSync(await stockDl.path(), 'utf8');
    expect(stock.split('\r\n')).toHaveLength(71);
    expect(stock).toContain(`${SOAP},Hotel Soap,Guest Amenities,Pcs,70,40,120,0,10,110,1,Good,OK`); // OUT 10 from Basement
    const [regDl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('inv-export-register').click()]);
    expect(fs.readFileSync(await regDl.path(), 'utf8')).toContain('"Room 5, 7"');

    expect(await page.getByTestId('inv-save').evaluate(b => getComputedStyle(b).position)).toBe('static');
});
