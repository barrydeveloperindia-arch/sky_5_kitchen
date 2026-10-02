import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { combos } from '../../02_Application_Source/data/combos';

// The printable menu (menu.html -> menu.pdf) is generated from combos.js by
// 03_Automation_System/generate_html_menus.js. If someone edits one without
// regenerating the other, guests see one price in the app and another on paper.

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();

function parsePrintedMenu(html) {
    const items = new Map();
    // Regular rows: <span class="item-name">X</span> ... <span class="item-price">₹N</span>
    const rowRe = /<span class="item-name">([^<]+)<\/span>[\s\S]*?<span class="item-price">₹([^<]+)<\/span>/g;
    for (const [, name, price] of html.matchAll(rowRe)) items.set(decode(name), price.trim());
    // Thali cards: <div class="thali-item-title" ...><span><span class="veg-icon"></span>X</span><span>₹N</span>
    const thaliRe = /class="thali-item-title"[^>]*>\s*<span>(?:<span[^>]*><\/span>)?([^<]+)<\/span>\s*<span>₹([^<]+)<\/span>/g;
    for (const [, name, price] of html.matchAll(thaliRe)) items.set(decode(name), price.trim());
    return items;
}

// Beverages are printed as grouped rows, e.g. "Tea / Coffee / Glass of Milk" -> "50 / 70 / 70"
function expandGroups(items) {
    const flat = new Map();
    for (const [name, price] of items) {
        const names = name.split(' / ');
        const prices = price.split(' / ');
        if (names.length > 1 && names.length === prices.length) {
            names.forEach((n, i) => flat.set(n.trim(), prices[i].trim()));
        } else {
            flat.set(name, price);
        }
    }
    return flat;
}

const MENU_FILES = ['04_Digital_Assets/menu.html', 'public/menu.html'];

describe.each(MENU_FILES)('Printed menu %s matches combos.js', (rel) => {
    const file = path.join(process.cwd(), rel);
    const printed = expandGroups(parsePrintedMenu(fs.readFileSync(file, 'utf8')));

    test('parser found the menu rows', () => {
        expect(printed.size).toBeGreaterThan(30);
    });

    test('every app item is on the printed card', () => {
        const missing = combos.filter(c => !printed.has(c.name)).map(c => c.name);
        expect(missing).toEqual([]);
    });

    test('every printed price equals the app price', () => {
        const mismatches = combos
            .filter(c => printed.has(c.name) && printed.get(c.name) !== String(c.price))
            .map(c => `${c.name}: app ₹${c.price} vs printed ₹${printed.get(c.name)}`);
        expect(mismatches).toEqual([]);
    });

    test('nothing is printed that the app no longer sells', () => {
        const appNames = new Set(combos.map(c => c.name));
        const extra = [...printed.keys()].filter(n => !appNames.has(n));
        expect(extra).toEqual([]);
    });
});
