import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackErrors, stubWindowOpen, openAdmin, adminTab, waitSaved } from './helpers';

// OPS Center -> Workforce -> Staff Directory (AuraLock-style staff list): add with photo, staff IDs,
// duplicate checks, Left / Rejoin, ID card print, search. Admin is a desktop screen.
test.skip(({ isMobile }) => isMobile, 'desktop screen');

const PHOTO = 'C:/Users/SAM/Documents/Antigravity/Hotal_Sky5/04_Digital_Assets/cat_03_05.png';
const opened = async (page) => page.evaluate(() => window.__opened || []);
const printedHtml = async (page) => (await opened(page)).filter(h => typeof h === 'string' && h.includes('<html')).pop() || '';

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await expect(page.getByTestId('staff-directory')).toBeVisible();
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

const openAdd = async (page) => {
    await page.getByTestId('sd-add').click();
    await expect(page.getByRole('heading', { name: 'Add new staff' })).toBeVisible();
};

test('list shows every person with Sr., staff ID column, counts and Active filter', async ({ page }) => {
    await expect(page.getByTestId('sd-count-total')).toHaveText('9');
    await expect(page.getByTestId('sd-count-active')).toHaveText('9');
    await expect(page.getByTestId('sd-count-left')).toHaveText('0');
    await expect(page.locator('[data-testid^="sd-row-"]')).toHaveCount(9);
    for (const h of ['Sr.', 'Staff ID', 'Name', 'Department', 'Shift', 'Mobile', 'Joined', 'Status']) await expect(page.getByRole('columnheader', { name: h, exact: true })).toBeVisible();
});

test('add staff with a photo: next SKY5 ID, saved everywhere, photo on the row, attendance link lists them', async ({ page }) => {
    await openAdd(page);
    await expect(page.getByTestId('sf-staff-id')).toHaveText('SKY5-001');
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Mohammad Hafeez');
    await page.getByTestId('staff-form').getByLabel('Department', { exact: true }).selectOption('housekeeping');
    await page.getByTestId('staff-form').getByLabel('Post', { exact: true }).fill('Electrician');
    await page.getByTestId('staff-form').getByLabel('Shift time', { exact: true }).fill('09:00 AM – 06:00 PM');
    await page.getByTestId('staff-form').getByLabel('Mobile', { exact: true }).fill('+91 98887 02845');
    await page.getByTestId('sf-photo-input').setInputFiles(PHOTO);
    await expect(page.getByRole('img', { name: 'New photo' })).toBeVisible();
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('staff-form')).toHaveCount(0);

    const row = page.getByTestId('sd-row-Mohammad Hafeez');
    await expect(row).toContainText('SKY5-001');
    await expect(row).toContainText('9888702845');
    await expect(row).toContainText('Housekeeping');
    await expect(row.getByRole('img', { name: 'Photo of Mohammad Hafeez' })).toBeVisible();
    await expect(page.getByTestId('sd-count-total')).toHaveText('10');
    await expect(page.getByTestId('sd-count-photo')).toHaveText('1');
    await expect(page.getByTestId('wf-count-housekeeping')).toHaveText('4 STAFF');
    await waitSaved(page);

    // the next person gets the next number
    await openAdd(page);
    await expect(page.getByTestId('sf-staff-id')).toHaveText('SKY5-002');
    await page.getByRole('button', { name: 'Cancel' }).click();

    // after a reload the photo still loads (saved in the database, not only on this screen)
    await page.reload();
    await openAdmin(page);
    await adminTab(page, 'workforce');
    await expect(page.getByTestId('sd-row-Mohammad Hafeez').getByRole('img', { name: 'Photo of Mohammad Hafeez' })).toBeVisible({ timeout: 15000 });

    await page.goto('/attendance');
    await expect(page.getByTestId('att-pick-Mohammad Hafeez')).toBeVisible();
});

test('form checks: required fields, 10-digit mobile, duplicate name and duplicate mobile', async ({ page }) => {
    await openAdd(page);
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('sf-error-name')).toHaveText('Name is required.');
    await expect(page.getByTestId('sf-error-role')).toHaveText('Post is required.');
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Ganga');
    await page.getByTestId('staff-form').getByLabel('Post', { exact: true }).fill('Front Desk');
    await page.getByTestId('staff-form').getByLabel('Mobile', { exact: true }).fill('967389287');
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('sf-error-phone')).toContainText('10 digits');
    await page.getByTestId('staff-form').getByLabel('Mobile', { exact: true }).fill('97793 95934'); // Gaurav Panchal's number in the test register
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('sf-error-phone')).toHaveText('This mobile is already saved for Gaurav Panchal.');
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('ratnesh');
    await page.getByTestId('staff-form').getByLabel('Mobile', { exact: true }).fill('');
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('sf-error-name')).toHaveText('ratnesh is already in the staff list.');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByTestId('sd-count-total')).toHaveText('9'); // nothing was added
});

test('Left: last working day asked, hidden from the Active list and the attendance link, shown under Former staff; Rejoin brings them back', async ({ page }) => {
    await page.getByTestId('sd-left-Karan').click();
    await expect(page.getByTestId('sd-left-dialog')).toBeVisible();
    await page.getByTestId('sd-left-date').fill('2026-10-10');
    await page.getByTestId('sd-left-confirm').click();
    await expect(page.getByTestId('sd-row-Karan')).toHaveCount(0);
    await expect(page.getByTestId('sd-count-left')).toHaveText('1');
    await expect(page.getByTestId('sd-former-Karan')).toContainText('Last day 10 Oct 2026');
    await page.getByTestId('sd-status-Left').click();
    await expect(page.getByTestId('sd-row-Karan')).toContainText('LEFT 10 Oct 2026');
    await expect(page.getByTestId('sd-former')).toHaveCount(0);   // the Former staff box is only under the Active list
    await waitSaved(page);

    await page.goto('/attendance');
    await expect(page.getByTestId('att-pick-Varun')).toBeVisible();
    await expect(page.getByTestId('att-pick-Karan')).toHaveCount(0);

    await openAdmin(page);
    await adminTab(page, 'workforce');
    await page.getByTestId('sd-status-Left').click();
    await page.getByTestId('sd-left-Karan').click(); // Rejoin
    await page.getByTestId('sd-status-Active').click();
    await expect(page.getByTestId('sd-row-Karan')).toContainText('ACTIVE');
    await expect(page.getByTestId('sd-count-left')).toHaveText('0');
});

test('Left can be cancelled at the confirm box', async ({ page }) => {
    await page.getByTestId('sd-left-Bhawna').click();
    await page.getByTestId('sd-left-cancel').click();
    await expect(page.getByTestId('sd-left-dialog')).toHaveCount(0);
    await expect(page.getByTestId('sd-row-Bhawna')).toContainText('ACTIVE');
    await expect(page.getByTestId('sd-count-left')).toHaveText('0');
});

test('edit: change department moves the person; their staff ID and photo stay', async ({ page }) => {
    await openAdd(page);
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Test Person');
    await page.getByTestId('staff-form').getByLabel('Post', { exact: true }).fill('Helper');
    await page.getByTestId('sf-photo-input').setInputFiles(PHOTO);
    await page.getByTestId('sf-save').click();
    await expect(page.getByTestId('sd-row-Test Person')).toContainText('SKY5-001');

    await page.getByTestId('sd-edit-Test Person').click();
    await expect(page.getByTestId('sf-staff-id')).toHaveText('SKY5-001');
    await page.getByTestId('staff-form').getByLabel('Department', { exact: true }).selectOption('kitchen');
    await page.getByTestId('staff-form').getByLabel('Post', { exact: true }).fill('Cook');
    await page.getByTestId('sf-save').click();
    const row = page.getByTestId('sd-row-Test Person');
    await expect(row).toContainText('Kitchen');
    await expect(row).toContainText('Cook');
    await expect(row).toContainText('SKY5-001');
    await expect(row.getByRole('img', { name: 'Photo of Test Person' })).toBeVisible();
    await expect(page.getByTestId('wf-count-kitchen')).toHaveText('4 STAFF');
    await expect(page.getByTestId('wf-count-reception')).toHaveText('3 STAFF');
});

test('search by name, ID, post or mobile; department filter; empty result message', async ({ page }) => {
    await page.getByTestId('sd-search').fill('amar');
    await expect(page.locator('[data-testid^="sd-row-"]')).toHaveCount(1);
    await page.getByTestId('sd-search').fill('8360585697');
    await expect(page.getByTestId('sd-row-Ratnesh')).toBeVisible();
    await page.getByTestId('sd-search').fill('nobody here');
    await expect(page.getByTestId('sd-empty')).toHaveText('No staff match this search.');
    await page.getByTestId('sd-search').fill('');
    await page.getByTestId('sd-dept').selectOption('kitchen');
    await expect(page.locator('[data-testid^="sd-row-"]')).toHaveCount(3);
});

test('ID card prints a Hotel Sky 5 card with the staff ID, name, post and return address', async ({ page }) => {
    await openAdd(page);
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('Card Person');
    await page.getByTestId('staff-form').getByLabel('Post', { exact: true }).fill('Front Desk');
    await page.getByTestId('staff-form').getByLabel('Mobile', { exact: true }).fill('9000011111');
    await page.getByTestId('sf-save').click();
    await page.getByTestId('sd-card-Card Person').click();
    const html = await printedHtml(page);
    for (const t of ['HOTEL SKY 5', 'SKY5-001', 'Card Person', 'Front Desk', '9000011111', 'Disha Arcade']) expect(html).toContain(t);
});

test('typed text cannot break the printed ID card (escaped)', async ({ page }) => {
    await openAdd(page);
    await page.getByTestId('staff-form').getByLabel('Full name (as on Aadhaar)', { exact: true }).fill('<b>X</b>');
    await page.getByTestId('staff-form').getByLabel('Post', { exact: true }).fill('"><script>alert(1)</script>');
    await page.getByTestId('sf-save').click();
    await page.getByTestId('sd-card-<b>X</b>').click();
    const html = await printedHtml(page);
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
});

test('no accessibility / contrast issues on the directory and the form', async ({ page }) => {
    const found = [];
    const check = async (name) => {
        const r = await new AxeBuilder({ page }).include('[data-testid="staff-directory"], [data-testid="staff-form"]').withTags(['wcag2a', 'wcag2aa']).analyze();
        for (const v of r.violations) found.push(`${name}: ${v.id} -> ${v.nodes[0].target.join(' ')}`);
    };
    await check('directory');
    await openAdd(page);
    await page.getByTestId('sf-save').click(); // with the error messages showing
    await check('form');
    expect(found).toEqual([]);
});

test('someone who left is not counted, not on the shift timeline and not in any staff dropdown; old attendance stays', async ({ page }) => {
    const field = (label) => page.locator('label', { hasText: label }).locator('..').locator('select, input').first();
    await expect(page.getByTestId('wf-count-kitchen')).toHaveText('3 STAFF');
    await expect(page.getByTestId('shift-row-Karan')).toHaveCount(1);
    await page.getByTestId('sd-left-Karan').click();
    await page.getByTestId('sd-left-confirm').click();
    await waitSaved(page);
    await expect(page.getByTestId('wf-count-kitchen')).toHaveText('2 STAFF');
    await expect(page.getByTestId('shift-row-Karan')).toHaveCount(0);
    await expect(page.getByTestId('shift-legend')).toContainText('Kitchen');
    // checkout "Inspected By" and the manual attendance log offer only people still working
    await adminTab(page, 'checkouts');
    await page.getByRole('button', { name: /RECORD NEW INSPECTION/ }).click();
    const inspected = await field('Inspected By').locator('option').allInnerTexts();
    expect(inspected.join('|')).not.toContain('Karan');
    expect(inspected.join('|')).toContain('Varun');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await adminTab(page, 'attendance');
    await expect(page.getByTestId('attendance-ledger').getByRole('row').filter({ hasText: 'Karan' })).toHaveCount(1);   // his old row is kept
    await page.getByRole('button', { name: '+ MANUAL LOG' }).click();
    const names = await page.locator('select').filter({ has: page.locator('option', { hasText: 'Varun' }) }).first().locator('option').allInnerTexts();
    expect(names.join('|')).not.toContain('Karan');
});
