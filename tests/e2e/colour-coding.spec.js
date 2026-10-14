import { test, expect } from '@playwright/test';
import { trackErrors, stubWindowOpen, openAdmin, adminTab } from './helpers';

// Colour coding means the same thing everywhere: green = ready / on time, red = needs action (to clean, late),
// navy = guest staying. Every colour also has a word next to it, and the counts in the header, the Today cards
// and the room cards agree with each other.
test.skip(({ isMobile }) => isMobile, 'colours are the same on every size');

// colour -> hue in degrees (works for rgb() and oklch() as the browser reports them)
function hueOf(css) {
    const ok = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/.exec(css);
    if (ok) return { hue: Number(ok[3]), chroma: Number(ok[2]), kind: 'oklch' };
    const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(css);
    if (!m) return null;
    const [r, g, b] = m.slice(1, 4).map(Number).map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { hue: (h * 60 + 360) % 360, chroma: d, kind: 'rgb' };
}
// rough colour families (oklch hues: red ~25, green ~145, blue/navy ~260; rgb hues: red ~0, green ~120, blue ~220)
const family = (css) => {
    const h = hueOf(css);
    if (!h || h.chroma < (h.kind === 'oklch' ? 0.03 : 0.12)) return 'grey';
    const x = h.hue;
    if (h.kind === 'oklch') return x < 50 || x > 340 ? 'red' : x < 110 ? 'amber' : x < 180 ? 'green' : 'blue';
    return x < 20 || x > 340 ? 'red' : x < 65 ? 'amber' : x < 170 ? 'green' : 'blue';
};
const colourOf = (loc) => loc.evaluate(el => getComputedStyle(el).color);
const num = async (loc) => Number((await loc.innerText()).replace(/[^\d]/g, ''));

let errors;
test.beforeEach(async ({ page }) => {
    errors = trackErrors(page);
    await stubWindowOpen(page);
    await openAdmin(page);
});
test.afterEach(() => { expect(errors, 'no console errors').toEqual([]); });

test('room status: READY is green, TO CLEAN is red, GUEST STAYING is navy - on every card, always with the word', async ({ page }) => {
    const board = page.getByTestId('room-board').or(page.locator('main'));
    const badges = { READY: [], 'TO CLEAN': [], 'GUEST STAYING': [] };
    for (const label of Object.keys(badges)) {
        const loc = board.getByText(label, { exact: true });
        const n = await loc.count();
        for (let i = 0; i < n; i++) badges[label].push(family(await colourOf(loc.nth(i))));
    }
    expect(badges.READY.length).toBeGreaterThan(0);
    expect(badges['TO CLEAN'].length).toBeGreaterThan(0);
    expect(badges['GUEST STAYING'].length).toBeGreaterThan(0);
    expect(new Set(badges.READY)).toEqual(new Set(['green']));
    expect(new Set(badges['TO CLEAN'])).toEqual(new Set(['red']));
    expect(new Set(badges['GUEST STAYING'])).toEqual(new Set(['blue']));

    // the header chips use the same colours and give the same counts as the cards
    expect(family(await colourOf(page.getByTestId('stat-available')))).toBe('green');
    expect(family(await colourOf(page.getByTestId('stat-dirty')))).toBe('red');
    expect(await num(page.getByTestId('stat-available'))).toBe(badges.READY.length);
    expect(await num(page.getByTestId('stat-dirty'))).toBe(badges['TO CLEAN'].length);
    expect(await num(page.getByTestId('stat-occupied'))).toBe(badges['GUEST STAYING'].length);
});

test('Today cards count the same rooms as the header and colour "to clean" red only when there is work', async ({ page }) => {
    await adminTab(page, 'today');
    expect(await num(page.getByTestId('today-kpi-available-value'))).toBe(await num(page.getByTestId('stat-available')));
    expect(await num(page.getByTestId('today-kpi-dirty-value'))).toBe(await num(page.getByTestId('stat-dirty')));
    const dirty = await num(page.getByTestId('today-kpi-dirty-value'));
    const icon = page.getByTestId('today-kpi-dirty').locator('span').first();
    expect(family(await colourOf(icon))).toBe(dirty ? 'red' : 'green');
    // occupancy % = rooms with guests / all rooms
    const pct = await num(page.getByTestId('today-kpi-occupancy-value'));
    const caption = await page.getByTestId('today-kpi-occupancy').innerText();
    const [, occ, all] = /(\d+) of (\d+) rooms/.exec(caption);
    expect(pct).toBe(Math.round((Number(occ) / Number(all)) * 100));
    expect(Number(occ)).toBe(await num(page.getByTestId('stat-occupied')));
});

test('attendance register: ON TIME green, LATE red, NOT IN grey - the word is always there with the colour', async ({ page }) => {
    await adminTab(page, 'attendance');
    const ledger = page.getByTestId('attendance-ledger');
    for (const [word, fam] of [['ON TIME', 'green'], ['LATE', 'red'], ['NOT IN', 'grey']]) {
        const loc = ledger.getByText(word, { exact: true });
        const n = await loc.count();
        expect(n, word).toBeGreaterThan(0);
        for (let i = 0; i < n; i++) expect(family(await colourOf(loc.nth(i))), `${word} #${i}`).toBe(fam);
    }
});

test('finance: the numbers on the screen add up (rooms + food + GST = total; balances agree with Today)', async ({ page }) => {
    const money = (t) => Number(String(t).replace(/[^\d]/g, ''));
    await adminTab(page, 'today');
    const todayDue = await num(page.getByTestId('today-kpi-due-value'));
    await adminTab(page, 'finance');
    const board = page.getByTestId('finance-board');
    const kpi = async (title) => money(await board.getByText(title, { exact: true }).locator('..').innerText());
    const row = async (label) => money(await board.getByText(label, { exact: true }).locator('..').locator('b').innerText());
    const rooms = await row('Room stays');
    const food = await row('Food on room bills');
    const gst = await row('GST payable');
    const total = await num(page.getByTestId('finance-total-billed'));
    expect(total).toBeGreaterThan(0);
    expect(Math.abs(rooms + food + gst - total), 'rooms + food + GST = total').toBeLessThanOrEqual(2);   // each is rounded to ₹1
    expect(Math.abs(await kpi('Bill so far (guests staying)') - (rooms + food))).toBeLessThanOrEqual(2);
    // every "Due ₹…" in the guest list adds up to Pending Balances, which is the Today "Balance due"
    const dues = await board.getByText(/^Due ₹/).allInnerTexts();
    const pending = await kpi('Pending Balances');
    expect(Math.abs(dues.reduce((s, t) => s + money(t), 0) - pending)).toBeLessThanOrEqual(dues.length);
    expect(pending).toBe(todayDue);
});
