import fs from 'fs';
import path from 'path';
import { combos } from '../02_Application_Source/data/combos.js';

const htmlFiles = [
    { path: '01_Design_Brand/OFFICIAL_MENU_CARD_V5.html', useThumbnails: false },
    { path: '01_Design_Brand/OFFICIAL_MENU_CARD_V6_LUXURY.html', useThumbnails: false },
    { path: '04_Digital_Assets/menu.html', useThumbnails: false },
    { path: 'public/menu.html', useThumbnails: true }
];

const renderHtmlItem = (item, showVegTag = false, useThumbnails = false) => {
    const hasDesc = !!item.description;
    const cleanDesc = hasDesc ? item.description.replace('🟢 ', '').replace('🔴 ', '') : '';
    const isNonVeg = item.description && item.description.includes('🔴');
    const isVeg = item.description && item.description.includes('🟢');

    let vegTag = '';
    if (showVegTag) {
        if (isNonVeg) {
            vegTag = '<span class="nonveg-icon"></span>';
        } else if (isVeg) {
            vegTag = '<span class="veg-icon"></span>';
        }
    }

    let popularTag = '';
    if (item.isPopular) {
        if (item.category === 'Snacks') {
            popularTag = '<span class="tag best">BEST SELLER</span>';
        } else {
            popularTag = '<span class="tag chef">CHEF\'S PICK</span>';
        }
    }

    let thumbHtml = '';
    let paddingLeft = '12px';
    if (useThumbnails) {
        thumbHtml = `<img class="item-thumb" src="${item.image}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover; flex-shrink: 0; margin-right: 4px;">`;
        paddingLeft = '42px';
    }

    return `
                        <div class="menu-item">
                            <div class="menu-item-main">
                                <div class="item-details">${vegTag}${thumbHtml}<span class="item-name">${item.name}</span>${popularTag}</div>
                                <span class="item-price">₹${item.price}</span>
                            </div>
                            ${hasDesc ? `<div class="menu-item-desc" style="font-size: 7.2px; color: var(--text-muted); font-style: italic; margin-top: 1px; padding-left: ${paddingLeft}; text-transform: none;">(${cleanDesc})</div>` : ''}
                        </div>`;
};

const renderBeveragesHtml = (useThumbnails = false) => {
    let teaThumb = '';
    let lemonThumb = '';
    let lassiThumb = '';
    let cokeThumb = '';
    let paddingLeft = '12px';

    if (useThumbnails) {
        teaThumb = `<img class="item-thumb" src="/images/food_tea.png" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover; flex-shrink: 0; margin-right: 4px;">`;
        lemonThumb = `<img class="item-thumb" src="/images/food_soda.png" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover; flex-shrink: 0; margin-right: 4px;">`;
        lassiThumb = `<img class="item-thumb" src="/images/food_lassi.png" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover; flex-shrink: 0; margin-right: 4px;">`;
        cokeThumb = `<img class="item-thumb" src="/images/food_cold_drink.png" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover; flex-shrink: 0; margin-right: 4px;">`;
        paddingLeft = '42px';
    }

    return `
                        <div class="menu-item">
                            <div class="menu-item-main">
                                <div class="item-details"><span class="veg-icon"></span>${teaThumb}<span class="item-name">Tea / Coffee / Glass of Milk</span></div>
                                <span class="item-price">₹50 / 70 / 70</span>
                            </div>
                        </div>
                        <div class="menu-item">
                            <div class="menu-item-main">
                                <div class="item-details"><span class="veg-icon"></span>${lemonThumb}<span class="item-name">Lemon Water / Fresh Lemonade / Plain Soda</span></div>
                                <span class="item-price">₹50 / 99 / 50</span>
                            </div>
                        </div>
                        <div class="menu-item">
                            <div class="menu-item-main">
                                <div class="item-details"><span class="veg-icon"></span>${lassiThumb}<span class="item-name">Sweet Lassi / Salted Lassi</span></div>
                                <span class="item-price">₹109 / 109</span>
                            </div>
                        </div>
                        <div class="menu-item">
                            <div class="menu-item-main">
                                <div class="item-details"><span class="veg-icon"></span>${cokeThumb}<span class="item-name">Coke / Limca / Mineral Water (1 Ltr)</span></div>
                                <span class="item-price">₹50 / 50 / 50</span>
                            </div>
                        </div>`;
};

const renderThalisHtml = (useThumbnails = false) => {
    return combos.filter(c => c.category === 'Thalis').map(item => {
        const isNonVeg = item.description.includes('🔴');
        const icon = isNonVeg ? '<span class="nonveg-icon"></span>' : '<span class="veg-icon"></span>';
        const cleanDesc = item.description.replace('🟢 ', '').replace('🔴 ', '');
        
        if (useThumbnails) {
            return `
                        <div class="thali-item" style="display: flex; flex-direction: row; gap: 10px; align-items: center; margin-bottom: 6px;">
                            <img class="thali-thumb" src="${item.image}" style="width: 50px; height: 50px; border-radius: 50%; border: 1px solid var(--gold); object-fit: cover; flex-shrink: 0;">
                            <div class="thali-info" style="flex: 1; display: flex; flex-direction: column;">
                                <div class="thali-item-title" style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: var(--gold);">
                                    <span>${icon}${item.name}</span>
                                    <span>₹${item.price}</span>
                                </div>
                                <p class="thali-desc" style="font-size: 7.5px; color: var(--text-muted); margin-top: 3px; line-height: 1.3;">${cleanDesc}</p>
                            </div>
                        </div>`;
        }

        return `
                        <div class="thali-item">
                            <div class="thali-item-title"><span>${icon}${item.name}</span><span>₹${item.price}</span></div>
                            <p class="thali-desc">${cleanDesc}</p>
                        </div>`;
    }).join('\n');
};

const processFile = ({ path: filePath, useThumbnails }) => {
    console.log(`Updating file: ${filePath}`);
    
    let content;
    if (useThumbnails) {
        // Use V5 as the structure template to guarantee all sections are present
        content = fs.readFileSync('01_Design_Brand/OFFICIAL_MENU_CARD_V5.html', 'utf8');
        // Inject custom stylesheet for .item-thumb if not exists
        const thumbStyle = `\n        .item-thumb {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid var(--gold);
            object-fit: cover;
            flex-shrink: 0;
        }`;
        content = content.replace('</style>', `${thumbStyle}\n    </style>`);
    } else {
        content = fs.readFileSync(filePath, 'utf8');
    }

    // 1. Inject or update CSS rules for .menu-item
    const oldStylePattern = /\.menu-item\s*\{[^}]*display:\s*flex[^}]*\}/;
    const newStyles = `.menu-item {
            display: flex;
            flex-direction: column;
            position: relative;
            margin-bottom: 4px;
        }
        .menu-item-main {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            width: 100%;
        }`;

    if (oldStylePattern.test(content)) {
        content = content.replace(oldStylePattern, newStyles);
    } else if (!content.includes('.menu-item-main')) {
        content = content.replace('</style>', `${newStyles}\n    </style>`);
    }

    // 2. Replace section items using regex
    const replaceSectionItems = (sectionTitle, newItemsHtml) => {
        const pattern = new RegExp(
            `(<span class="section-title">` + sectionTitle + `<\/span>.*?<div class="item-list">)(.*?)(<\/div>\\s*<\/section>)`,
            's'
        );
        if (pattern.test(content)) {
            content = content.replace(pattern, `$1${newItemsHtml}\n                    $3`);
        } else {
            console.warn(`WARNING: Could not find section: ${sectionTitle}`);
        }
    };

    // Render lists
    const breakfastHtml = combos.filter(c => c.category === 'Breakfast').map(item => renderHtmlItem(item, false, useThumbnails)).join('');
    const snacksHtml = combos.filter(c => c.category === 'Snacks').map(item => renderHtmlItem(item, true, useThumbnails)).join('');
    const chineseHtml = combos.filter(c => c.category === 'Chinese').map(item => renderHtmlItem(item, false, useThumbnails)).join('');
    const riceHtml = combos.filter(c => c.category === 'Rice').map(item => renderHtmlItem(item, false, useThumbnails)).join('');
    const dessertsHtml = combos.filter(c => c.category === 'Sweet Dish').map(item => renderHtmlItem(item, false, useThumbnails)).join('');
    const beveragesHtml = renderBeveragesHtml(useThumbnails);
    
    const vegMainHtml = combos.filter(c => c.category === 'Main Course' && c.description.includes('🟢')).map(item => renderHtmlItem(item, true, useThumbnails)).join('');
    const nonVegMainHtml = combos.filter(c => c.category === 'Main Course' && c.description.includes('🔴')).map(item => renderHtmlItem(item, true, useThumbnails)).join('');
    const breadsHtml = combos.filter(c => c.category === 'Breads').map(item => renderHtmlItem(item, false, useThumbnails)).join('');
    const saladHtml = combos.filter(c => c.category === 'Salad').map(item => renderHtmlItem(item, false, useThumbnails)).join('');
    const thalisHtml = renderThalisHtml(useThumbnails);

    replaceSectionItems('BREAKFAST COMBOS', breakfastHtml);
    replaceSectionItems('ALL DAY SNACKS', snacksHtml);
    replaceSectionItems('CHINESE WOK', chineseHtml);
    replaceSectionItems('RICE DELIGHTS', riceHtml);
    replaceSectionItems('DESSERTS', dessertsHtml);
    replaceSectionItems('BEVERAGES', beveragesHtml);
    replaceSectionItems('VEGETARIAN MAIN DISHES', vegMainHtml);
    replaceSectionItems('NON-VEGETARIAN MAIN DISHES', nonVegMainHtml);
    replaceSectionItems('BREADS', breadsHtml);
    replaceSectionItems('SALAD', saladHtml);

    // Thali grid replacement
    const thaliPattern = /(<div class="thali-header">COMBOS & THALIS - BEST VALUE<\/div>\s*<div class="thali-grid">)(.*?)(<\/div>\s*<\/section>)/s;
    if (thaliPattern.test(content)) {
        content = content.replace(thaliPattern, `$1${thalisHtml}\n                    $3`);
    } else {
        console.warn('WARNING: Could not find thali-grid container');
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated: ${filePath}`);
};

htmlFiles.forEach(processFile);
console.log('All HTML files updated successfully!');
