import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, waitSaved } from './helpers';

// Phase 2: OPS Center data lives in the database (emulator here) and is shared by every device.
test.skip(({ isMobile }) => isMobile, 'desktop admin + a second device');

const projectOf = (page) => page.evaluate(() => localStorage.getItem('sky5_emu_project'));

async function secondDevice(browser, project, { mobile = false } = {}) {
    const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(p => { localStorage.setItem('sky5_emu_project', p); }, project);
    const page = await ctx.newPage();
    await stubWindowOpen(page);
    return { ctx, page };
}

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('check-in survives a page refresh', async ({ page }) => {
    await openAdmin(page);
    await expect(page.getByTestId('admin-live')).toContainText('Live');
    await page.getByTestId('room-card-2').getByRole('button', { name: 'CHECK-IN' }).click();
    await page.getByPlaceholder('Lead Guest Full Name').fill('Persisted Guest');
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await expect(page.getByTestId('room-card-2')).toContainText('Persisted Guest');
    await waitSaved(page);
    await page.reload();
    await openAdmin(page);
    await expect(page.getByTestId('room-card-2')).toContainText('Persisted Guest', { timeout: 15000 });
    await expect(page.getByTestId('stat-occupied')).toContainText('4');
});

test('reception on one computer, the other computer sees it live (no refresh)', async ({ page, browser }) => {
    await openAdmin(page);
    const other = await secondDevice(browser, await projectOf(page));
    await openAdmin(other.page);
    await expect(other.page.getByTestId('admin-live')).toContainText('Live');

    await page.getByTestId('room-card-3').getByRole('button', { name: 'MARK CLEANED' }).click();
    await expect(other.page.getByTestId('room-card-3')).toContainText('CLEAN', { timeout: 10000 });
    await expect(other.page.getByTestId('stat-dirty')).toContainText('2');

    // and back the other way
    await other.page.getByTestId('room-card-4').getByRole('button', { name: 'CHECK-IN' }).click();
    await other.page.getByPlaceholder('Lead Guest Full Name').fill('Guest From PC 2');
    await other.page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await expect(page.getByTestId('room-card-4')).toContainText('Guest From PC 2', { timeout: 10000 });
    await other.ctx.close();
});

test('guest orders on a phone -> kitchen screen shows it live; room charge lands on the folio', async ({ page, browser }) => {
    await openAdmin(page);
    await adminTab(page, 'kitchen');
    const phone = await secondDevice(browser, await projectOf(page), { mobile: true });
    await phone.page.goto('/');
    const papad = phone.page.locator('.modern-item-card', { has: phone.page.locator('.item-title-modern', { hasText: 'Masala Papad' }) });
    await papad.locator('.add-btn-square').click();
    await phone.page.locator('.cart-floating-bar').click();
    await phone.page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await phone.page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Room 7');
    await phone.page.locator('.pay-option', { hasText: 'Room Charge' }).click();
    await phone.page.getByRole('button', { name: 'CONFIRM ROOM CHARGE' }).click();
    await expect(phone.page.getByTestId('invoice-payment')).toContainText('Charged to Room 7');

    await expect(page.locator('tr', { hasText: 'Room 7' }).first()).toContainText('1x Masala Papad', { timeout: 10000 });
    await adminTab(page, 'reception');
    await expect(page.getByTestId('room-card-7')).toContainText(/Food Bill:\s*₹100/, { timeout: 10000 });
    await phone.ctx.close();
});

test('kitchen status, logs, attendance, settlements and staff edits are all saved', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'kitchen');
    await page.locator('tr', { hasText: 'ORD-8241' }).getByRole('button', { name: 'PREPARE' }).click();

    await adminTab(page, 'attendance');
    await page.locator('tr', { hasText: 'Arjun Tiwari' }).getByRole('button', { name: 'CHECK-OUT' }).click();

    await adminTab(page, 'workforce');
    await page.getByText('EDIT', { exact: true }).first().click();
    await page.locator('label', { hasText: 'Phone Number' }).locator('..').locator('input').fill('+91 91111 11111');
    await page.getByRole('button', { name: 'UPDATE' }).click();

    await adminTab(page, 'reception');
    await page.getByTestId('room-card-12').getByRole('button', { name: 'CHECK-OUT' }).click();
    await page.locator('label', { hasText: 'Inspected By' }).locator('..').locator('select').selectOption({ index: 1 });
    page.once('dialog', d => d.accept());
    await page.getByRole('button', { name: 'SAVE CHECKOUT' }).click();
    await expect(page.getByTestId('room-card-12')).toContainText('DIRTY');
    await waitSaved(page);

    await page.reload();
    await openAdmin(page);
    await adminTab(page, 'kitchen');
    await expect(page.locator('tr', { hasText: 'ORD-8241' })).toContainText('Preparing', { timeout: 15000 });
    await adminTab(page, 'attendance');
    await expect(page.locator('tr', { hasText: 'Arjun Tiwari' }).getByRole('button', { name: 'CHECK-OUT' })).toHaveCount(0);
    await adminTab(page, 'workforce');
    await expect(page.getByText('+91 91111 11111')).toBeVisible();
    await adminTab(page, 'checkouts');
    await expect(page.locator('tr', { hasText: 'Room' }).first()).toBeVisible();
    await adminTab(page, 'finance');
    await expect(page.getByTestId('finance-settlements')).toContainText('Vikram Singh');
    await adminTab(page, 'reception');
    await expect(page.getByTestId('room-card-12')).toContainText('DIRTY');
});

test('menu price / hidden item is saved and reaches the shop after refresh', async ({ page }) => {
    await openAdmin(page);
    await adminTab(page, 'menu-config');
    const lassi = page.locator('tr', { has: page.getByText('Sweet Lassi', { exact: true }) });
    await lassi.locator('input[type="number"]').fill('129');
    await lassi.locator('input[type="number"]').press('Enter');
    const tea = page.locator('tr', { has: page.getByText('Tea', { exact: true }) });
    await tea.getByRole('button', { name: 'ACTIVE' }).click();
    await waitSaved(page);
    await page.goto('/');
    await page.locator('.filter-chip', { hasText: 'Beverages' }).click();
    await expect(page.locator('.modern-item-card', { hasText: 'Sweet Lassi' })).toContainText('₹129', { timeout: 15000 });
    await expect(page.locator('.item-title-modern', { hasText: /^🟢\s*Tea$/ })).toHaveCount(0);
});

// QA night 1: the guest form used to write back the food bill it had when opened
test('EDIT GUEST save keeps a room-charge food order placed meanwhile on another device', async ({ page, browser }) => {
    await openAdmin(page);
    const foodOf = async () => {
        await page.getByTestId('room-open-5').click();
        const t = await page.getByTestId('room-sheet').getByText('Food Bill:').locator('..').innerText();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('room-sheet')).toHaveCount(0);
        return Number(t.replace(/[^\d]/g, ''));
    };
    const before = await foodOf();
    await page.getByTestId('room-card-5').getByRole('button', { name: 'EDIT GUEST' }).click();
    await page.getByPlaceholder('Verified Mobile Number').fill('9811111111');

    const other = await secondDevice(browser, await projectOf(page));
    await other.page.goto('/');
    await other.page.locator('.modern-item-card', { has: other.page.locator('.item-title-modern', { hasText: 'Masala Papad' }) }).locator('.add-btn-square').click();
    await other.page.locator('.cart-floating-bar').click();
    await other.page.getByRole('button', { name: /PROCEED TO PAY/ }).click();
    await other.page.getByPlaceholder('e.g. Table 4 or Room 102').fill('Room 5');
    await other.page.locator('.pay-option', { hasText: 'Room Charge' }).click();
    await other.page.getByRole('button', { name: 'CONFIRM ROOM CHARGE' }).click();
    await expect(other.page.getByTestId('invoice-payment')).toContainText('Charged to Room 5');

    // the open form now shows the live food bill too
    await expect.poll(async () => Number((await page.getByText('Food Bill', { exact: false }).first().locator('..').innerText()).replace(/[^\d]/g, '')), { timeout: 15000 }).toBeGreaterThan(before);
    await page.getByRole('button', { name: 'AUTHORIZE & SAVE' }).click();
    await waitSaved(page);
    expect(await foodOf()).toBeGreaterThan(before);
    await other.ctx.close();
});
