import fs from 'fs';
import path from 'path';

const filePath = '01_Design_Brand/OFFICIAL_SERIALIZED_MENU_V20.html';
console.log(`Updating file: ${filePath}`);
let content = fs.readFileSync(filePath, 'utf8');

const replacements = {
    // 02 BREAKFAST
    'FRESH MORNING BREAKFAST COMBOS': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Aloo Paratha Combo (Curd & Tea/Water)</span><span class="item-dots"></span><span class="item-price">₹169</span></div>
                        <div class="menu-item"><span class="item-name">Paneer Paratha Combo (Curd & Tea/Water)</span><span class="item-dots"></span><span class="item-price">₹209</span></div>
                        <div class="menu-item"><span class="item-name">Omelette Combo (2 Eggs, Toast, Tea)</span><span class="item-dots"></span><span class="item-price">₹159</span></div>
                        <div class="menu-item"><span class="item-name">Boiled Eggs (2 Pcs)</span><span class="item-dots"></span><span class="item-price">₹80</span></div>
                        <div class="menu-item"><span class="item-name">Egg Bhurji / Scrambled Eggs</span><span class="item-dots"></span><span class="item-price">₹120</span></div>
                        <div class="menu-item"><span class="item-name">Poha Combo (Poha & Tea / Lemon Water)</span><span class="item-dots"></span><span class="item-price">₹129</span></div>
                        <div class="menu-item"><span class="item-name">Veg Sandwich Combo (Sandwich & Tea)</span><span class="item-dots"></span><span class="item-price">₹159</span></div>
                        <div class="menu-item" style="font-size: 7.5px; font-weight: bold; color: var(--gold);"><span class="item-name">* COFFEE UPGRADE</span><span class="item-dots"></span><span class="item-price">+ ₹20</span></div>
                    </div>`,

    // 03 SNACKS
    'ALL DAY SAVORY SNACKS': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Mix Pakora (12 Pcs)</span><span class="tag tag-best">BEST SELLER</span><span class="item-dots"></span><span class="item-price">₹199</span></div>
                        <div class="menu-item"><span class="item-name">French Fries</span><span class="item-dots"></span><span class="item-price">₹169</span></div>
                        <div class="menu-item"><span class="item-name">Plain / Masala Papad (1 Pc)</span><span class="item-dots"></span><span class="item-price">₹80 / 100</span></div>
                        <div class="menu-item"><span class="item-name">Peanuts Masala</span><span class="item-dots"></span><span class="item-price">₹149</span></div>
                        <div class="menu-item"><span class="item-name">Honey Chilli Potato</span><span class="item-dots"></span><span class="item-price">₹209</span></div>
                        <div class="menu-item"><span class="item-name">Chicken Pakora</span><span class="item-dots"></span><span class="item-price">₹249</span></div>
                    </div>`,

    // 04 CHINESE
    'CHINESE WOK SPECIALS': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Veg Manchurian Gravy</span><span class="item-dots"></span><span class="item-price">₹249</span></div>
                        <div class="menu-item"><span class="item-name">Chilli Potato</span><span class="item-dots"></span><span class="item-price">₹199</span></div>
                    </div>`,

    // 05 MAIN COURSE
    'ROYAL MAIN COURSE': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Dal Makhani</span><span class="tag tag-best">BEST</span><span class="item-dots"></span><span class="item-price">₹229</span></div>
                        <div class="menu-item"><span class="item-name">Paneer Butter Masala</span><span class="item-dots"></span><span class="item-price">₹289</span></div>
                        <div class="menu-item"><span class="item-name">Kadhai Paneer</span><span class="item-dots"></span><span class="item-price">₹249</span></div>
                        <div class="menu-item"><span class="item-name">Butter Chicken (Half/Full)</span><span class="item-dots"></span><span class="item-price">₹399 / 599</span></div>
                        <div class="menu-item"><span class="item-name">Dal Tadka / Chana Masala</span><span class="item-dots"></span><span class="item-price">₹199 / 229</span></div>
                        <div class="menu-item"><span class="item-name">Egg Curry (2 Pcs)</span><span class="item-dots"></span><span class="item-price">₹179</span></div>
                        <div class="menu-item"><span class="item-name">Chicken Curry (Qtr)</span><span class="item-dots"></span><span class="item-price">₹199</span></div>
                        <div class="menu-item"><span class="item-name">Chilly Chicken (Half/Full)</span><span class="item-dots"></span><span class="item-price">₹399 / 599</span></div>
                    </div>`,

    // 06 RICE
    'RICE & BASMATI DELIGHTS': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Plain Rice / Jeera Rice</span><span class="item-dots"></span><span class="item-price">₹119 / 169</span></div>
                        <div class="menu-item"><span class="item-name">Veg Fried Rice</span><span class="item-dots"></span><span class="item-price">₹219</span></div>
                    </div>`,

    // 07 SALADS & DESSERTS
    'SALADS & DESSERTS': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Fresh Salad / Chickpea Salad</span><span class="item-dots"></span><span class="item-price">₹119 / 169</span></div>
                        <div class="menu-item"><span class="item-name">Gulab Jamun (2 pcs) / Kulfi</span><span class="item-dots"></span><span class="item-price">₹109 / 99</span></div>
                        <div class="menu-item"><span class="item-name">Ice Cream (Single / Double Scoop)</span><span class="item-dots"></span><span class="item-price">₹99 / 169</span></div>
                    </div>`,

    // 08 BREADS
    'TRADITIONAL INDIAN BREADS': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Tawa Roti / Butter Roti / Missi Roti</span><span class="item-dots"></span><span class="item-price">₹25 / 30 / 40</span></div>
                        <div class="menu-item"><span class="item-name">Malabar Paratha</span><span class="item-dots"></span><span class="item-price">₹60</span></div>
                    </div>`,

    // 09 BEVERAGES
    'BEVERAGES & SHAKES': `                    <div class="item-list">
                        <div class="menu-item"><span class="item-name">Tea / Coffee / Glass of Milk</span><span class="item-dots"></span><span class="item-price">₹50 / 70 / 70</span></div>
                        <div class="menu-item"><span class="item-name">Lemon Water / Fresh Lemonade / Plain Soda</span><span class="item-dots"></span><span class="item-price">₹50 / 99 / 50</span></div>
                        <div class="menu-item"><span class="item-name">Sweet Lassi / Salted Lassi</span><span class="item-dots"></span><span class="item-price">₹109 / 109</span></div>
                        <div class="menu-item"><span class="item-name">Coke / Limca / Mineral Water (1 Ltr)</span><span class="item-dots"></span><span class="item-price">₹50 / 50 / 50</span></div>
                    </div>`,

    // 10 COMBOS & THALIS
    'CHEF\'S COMBOS & THALIS': `                    <div class="thali-grid">
                        <div class="thali-item"><span>VEG COMBO</span><span style="float:right">₹249</span><p class="thali-desc">Dal Makhani, Jeera Rice, 2 Tawa Rotis</p></div>
                        <div class="thali-item"><span>NON-VEG DELUXE THALI</span><span style="float:right">₹499</span><p class="thali-desc">1 Chicken, Rice, 2 Roti, Salad, Pickle, 1 Papad</p></div>
                    </div>`
};

for (const [title, listHtml] of Object.entries(replacements)) {
    let pattern;
    if (title === 'CHEF\'S COMBOS & THALIS') {
        pattern = new RegExp(
            `(<div class="cat-title">` + title + `<\/div>\\s*<\/div>\\s*)(<div class="thali-grid">.*?<\/div>\\s*<\/section>)`,
            's'
        );
    } else {
        pattern = new RegExp(
            `(<div class="cat-title">` + title + `<\/div>\\s*<\/div>\\s*)(<div class="item-list">.*?<\/div>\\s*<\/section>)`,
            's'
        );
    }

    if (pattern.test(content)) {
        content = content.replace(pattern, `$1${listHtml}\n                </section>`);
    } else {
        console.warn(`WARNING: Could not find section: ${title}`);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated OFFICIAL_SERIALIZED_MENU_V20.html');
