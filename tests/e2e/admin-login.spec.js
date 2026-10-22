import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, createTestAdmin, ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from './helpers';

// OPS Center (every edit: staff, faces, PINs, rooms, menu...) opens only after the admin login.
test.skip(({ isMobile }) => isMobile, 'once is enough');

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await page.goto('/');
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await createTestAdmin(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

const clickAdmin = (page) => page.getByText('Admin', { exact: true }).filter({ visible: true }).first().click();
const login = async (page, email, password) => {
    await page.getByTestId('admin-email').fill(email);
    await page.getByTestId('admin-password').fill(password);
    await page.getByTestId('admin-login').click();
};

test('Admin shows the login; nothing of the OPS Center before it; a wrong password or another email is refused; the admin gets in', async ({ page }) => {
    await clickAdmin(page);
    await expect(page.getByTestId('admin-gate')).toBeVisible();
    await expect(page.getByTestId('nav-workforce')).toHaveCount(0);
    await expect(page.getByTestId('admin-email')).toHaveValue(ADMIN_EMAIL);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(axe.violations.map(v => v.id)).toEqual([]);
    await login(page, ADMIN_EMAIL, 'wrong-pass');
    await expect(page.getByTestId('admin-error')).toContainText('Wrong email or password');
    await login(page, 'staff@sky5.com', TEST_ADMIN_PASSWORD);
    await expect(page.getByTestId('admin-error')).toContainText('Only the hotel admin');
    await expect(page.getByTestId('nav-workforce')).toHaveCount(0);
    await login(page, ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today', { timeout: 15000 });
    // staying logged in after a reload
    await page.reload();
    await clickAdmin(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today', { timeout: 15000 });
    await expect(page.getByTestId('admin-gate')).toHaveCount(0);
});

test('Log out closes the OPS Center; the next visit asks again; Back returns to the shop', async ({ page }) => {
    await clickAdmin(page);
    await page.getByTestId('admin-cancel').click();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await clickAdmin(page);
    await login(page, ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today', { timeout: 15000 });
    await page.getByTestId('admin-logout').click();
    await expect(page.locator('.modern-item-card').first()).toBeVisible();
    await clickAdmin(page);
    await expect(page.getByTestId('admin-gate')).toBeVisible();
    await expect(page.getByTestId('admin-password')).toHaveValue('');
});
