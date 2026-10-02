import { expect } from '@playwright/test';
import { stubWindowOpen, openAdmin, adminTab } from './helpers';
import { inventoryItems } from '../../02_Application_Source/data/inventory';

// Runs against the local Firebase emulator, never the live database.
// Each test gets its own emulator project so parallel tests never share data.
export const SOAP = inventoryItems.find(i => i.name === 'Hotel Soap').code; // opening 120
export const WATER = inventoryItems.find(i => i.name === 'Water Bottle (250 ml)').code;

export function emuProjectFor(testInfo) {
    return `demo-sky5-${testInfo.testId.split('-').pop().slice(0, 10)}-${testInfo.repeatEachIndex}-${testInfo.retry}`.toLowerCase();
}

export async function applyEmulatorProject(context, project) {
    await context.addInitScript(p => { localStorage.setItem('sky5_emu_project', p); }, project);
}

export async function waitForEmulators(request) {
    for (const url of ['http://127.0.0.1:8181/', 'http://127.0.0.1:9199/']) {
        await expect.poll(async () => {
            try { return (await request.get(url)).status() < 500; } catch { return false; }
        }, { timeout: 60000, intervals: [500] }).toBe(true);
    }
}

export async function setupInventoryTest({ page, context, request }, testInfo) {
    const project = emuProjectFor(testInfo);
    await applyEmulatorProject(context, project);
    await waitForEmulators(request);
    await stubWindowOpen(page);
    page.on('dialog', d => d.accept());
    return project;
}

export async function openInventory(page) {
    await openAdmin(page);
    await adminTab(page, 'inventory');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Inventory Dashboard');
    await expect(page.getByTestId('inventory-view')).toBeVisible({ timeout: 20000 });
}

export async function openStaffPage(page) {
    await page.goto('/inventory');
    await expect(page.getByTestId('inventory-view')).toBeVisible({ timeout: 20000 });
}

export async function pickItem(page, code) {
    const selected = page.getByTestId('inv-item-selected');
    if (await selected.count()) await selected.getByRole('button', { name: 'Change item' }).click();
    await page.getByTestId('inv-item-search').fill(code);
    const target = code.startsWith('SKY-') ? code : inventoryItems.find(i => i.name.toLowerCase().includes(code)).code;
    await page.getByTestId(`inv-item-option-${target}`).click();
}

export async function addEntry(page, { code, type, qty, by = 'Bhawna', party = '' }) {
    await pickItem(page, code);
    await page.getByTestId(`inv-type-${type}`).click();
    await page.getByTestId('inv-qty').fill(String(qty));
    if (party) await page.getByTestId('inv-party').fill(party);
    await page.getByTestId('inv-by').fill(by);
    await page.getByTestId('inv-save').click();
}

export const row = (page, code) => page.getByTestId(`inv-row-${code}`);
