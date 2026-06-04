/**
 * HOTEL SKY 5 - AUTHENTIC INDIAN VEG & NON-VEG DATABASE (CURATED LIST)
 * 5-Star Hospitality Grade Imagery (Local Verified Assets)
 */

const getImg = (type) => {
    const urls = {
        paratha: "/images/food_paratha.png",
        snacks: "/images/food_snacks.png",
        thali: "/images/food_thali.png",
        thali_deluxe: "/images/food_thali_deluxe.png",
        thali_nonveg: "/images/food_thali_nonveg.png",
        thali_nonveg_special: "/images/food_thali_nonveg_special.png",
        paneer: "/images/food_paneer.png",
        dal: "/images/food_dal.png",
        rice: "/images/food_rice.png",
        roti: "/images/food_roti.png",
        tea: "/images/food_tea.png",
        lassi: "/images/food_lassi.png",
        soda: "/images/food_soda.png",
        sandwich: "/images/food_sandwich.png",
        toast: "/images/food_toast.png",
        egg: "/images/food_egg.png",
        omelette: "/images/food_omelette.png",
        poha: "/images/food_poha.png",
        fries: "/images/food_french_fries.png",
        noodles: "/images/food_noodles.png",
        salad: "/images/food_salad.png",
        milk: "/images/food_milk.png",
        cold_drink: "/images/food_cold_drink.png",
        mineral_water: "/images/food_mineral_water.png",
        amul_coke: "/images/food_amul_coke.png",
        paneer_butter_masala: "/images/food_paneer_butter_masala.png",
        mix_veg: "/images/food_mix_veg.png",
        butter_chicken: "/images/food_butter_chicken.png",
        chicken_curry: "/images/food_chicken_curry.png",
        chilly_chicken: "/images/food_chilly_chicken.png"
    };
    return urls[type] || urls.thali;
};

export const combos = [
    // --- BREAKFAST (5 items) ---
    { id: 1001, category: "Breakfast", name: "Aloo Paratha Combo", description: "🟢 Stuffed whole wheat flatbread served with fresh curd, pickle, and Tea / Black Tea / Lemon Water / Ginger Tea / Coffee / Ready-made Coffee / Amul Butter (10gm).", price: 169, image: getImg("paratha"), isPopular: true },
    { id: 1002, category: "Breakfast", name: "Paneer Paratha Combo", description: "🟢 Spiced paneer-stuffed flatbread served with fresh curd, pickle, and Tea / Black Tea / Lemon Water / Ginger Tea / Coffee / Amul Butter (10gm).", price: 209, image: getImg("paratha"), isPopular: true },
    { id: 1003, category: "Breakfast", name: "Omelette Combo", description: "🔴 Fluffy 2-Egg Omelette served with golden bread toast and Tea / Black Tea / Lemon Water.", price: 159, image: getImg("omelette") },
    { id: 1006, category: "Breakfast", name: "Boiled Eggs (2 Pcs)", description: "🔴 Freshly boiled eggs served with salt and pepper.", price: 80, image: getImg("egg") },
    { id: 1007, category: "Breakfast", name: "Egg Bhurji / Scrambled Eggs", description: "🔴 Spiced Indian style scrambled eggs (Bhurji) or classic scrambled eggs as per choice.", price: 120, image: getImg("egg") },
    { id: 1004, category: "Breakfast", name: "Poha Combo", description: "🟢 Light and healthy flattened rice savory mix (with or without peanuts as per choice), served with Tea / Black Tea / Lemon Water / Coffee.", price: 129, image: getImg("poha") },
    { id: 1005, category: "Breakfast", name: "Veg Sandwich Combo", description: "🟢 Double-decker cold sandwich with garden fresh veggies (4 Pcs), served with Tea / Black Tea / Lemon Water.", price: 159, image: getImg("sandwich") },

    // --- SNACKS (7 items) ---
    { id: 2001, category: "Snacks", name: "Masala Papad", description: "🟢 (1 Pc) Crispy roasted thin lentil disc topped with spiced onion, tomato, and lemon mix.", price: 100, image: getImg("snacks") },
    { id: 2006, category: "Snacks", name: "Plain Papad", description: "🟢 (1 Pc) Crispy roasted thin plain lentil disc.", price: 80, image: getImg("snacks") },
    { id: 2002, category: "Snacks", name: "French Fries", description: "🟢 Classic golden potato fries served hot and crispy.", price: 169, image: getImg("fries") },
    { id: 2007, category: "Snacks", name: "Peanuts Masala", description: "🟢 Spiced crunchy peanuts tossed with chopped onions, tomatoes, green chilies, and fresh lemon.", price: 149, image: getImg("snacks") },
    { id: 2003, category: "Snacks", name: "Mix Pakora", description: "🟢 Golden batter-fried spiced mixed vegetable fritters (12 Pcs).", price: 199, image: getImg("snacks"), isPopular: true },
    { id: 2004, category: "Snacks", name: "Honey Chilli Potato", description: "🟢 Crispy fried potato strips tossed in sweet and spicy glazed honey-chilli sauce.", price: 209, image: getImg("fries") },
    { id: 2005, category: "Snacks", name: "Chicken Pakora", description: "🔴 Crispy batter-fried chicken bites seasoned with traditional spices (9 Pcs).", price: 249, image: getImg("snacks") },

    // --- SALADS (2 items) ---
    { id: 5001, category: "Salad", name: "Fresh Salad", description: "🟢 Crisp slices of tomato, cucumber, onion, and lemon.", price: 119, image: getImg("salad") },
    { id: 5002, category: "Salad", name: "Chickpea Salad", description: "🟢 Wholesome protein-rich boiled chickpeas tossed with tomatoes, onions, and chaat spices.", price: 169, image: getImg("salad") },

    // --- CHINESE (2 items) ---
    { id: 2501, category: "Chinese", name: "Chilli Potato", description: "🟢 Crispy fried potatoes wok-tossed in a hot, sweet, and tangy Indo-Chinese chili sauce.", price: 199, image: getImg("fries") },
    { id: 2502, category: "Chinese", name: "Veg Manchurian Gravy", description: "🟢 Crispy vegetable balls simmered in a dark, savory, ginger-garlic soy glaze.", price: 249, image: getImg("paneer") },

    // --- VEG MAIN COURSE (5 items) ---
    { id: 4001, category: "Main Course", name: "Dal Tadka", description: "🟢 Whole yellow lentils tempered with ghee, cumin seeds, garlic, and dry red chilies.", price: 199, image: getImg("dal") },
    { id: 4002, category: "Main Course", name: "Dal Makhani", description: "🟢 Slow-cooked creamy black lentils simmered overnight with butter, ghee, and cream.", price: 229, image: getImg("dal"), isPopular: true },
    { id: 4003, category: "Main Course", name: "Chana Masala", description: "🟢 Spicy chickpeas cooked in a tangy Punjabi-style tomato-onion curry sauce.", price: 229, image: getImg("mix_veg") },
    { id: 4004, category: "Main Course", name: "Kadhai Paneer", description: "🟢 Fresh cottage cheese cubes tossed with bell peppers and roasted fresh kadhai spices.", price: 249, image: getImg("paneer") },
    { id: 4005, category: "Main Course", name: "Paneer Butter Masala", description: "🟢 Soft paneer cubes cooked in a rich, creamy, sweet-and-spicy tomato gravy.", price: 289, image: getImg("paneer_butter_masala"), isPopular: true },

    // --- NON-VEG MAIN COURSE (7 items) ---
    { id: 4101, category: "Main Course", name: "Egg Curry", description: "🔴 Hard-boiled eggs (2 Pcs) simmered in a rich, spiced onion-tomato gravy curry.", price: 179, image: getImg("egg") },
    { id: 4103, category: "Main Course", name: "Butter Chicken (Half)", description: "🔴 Juicy tandoor-roasted chicken tikka chunks in a buttery, rich, creamy tomato gravy (Half Portion).", price: 399, image: getImg("butter_chicken") },
    { id: 4104, category: "Main Course", name: "Butter Chicken (Full)", description: "🔴 Juicy tandoor-roasted chicken tikka chunks in a buttery, rich, creamy tomato gravy (Full Portion).", price: 599, image: getImg("butter_chicken"), isPopular: true },
    { id: 4105, category: "Main Course", name: "Chicken Curry (Qtr)", description: "🔴 Spiced chicken curry (Quarter Portion).", price: 199, image: getImg("chicken_curry") },
    { id: 4107, category: "Main Course", name: "Chilly Chicken (Half)", description: "🔴 Wok-tossed spicy chilly chicken (Half Portion).", price: 399, image: getImg("chilly_chicken") },
    { id: 4108, category: "Main Course", name: "Chilly Chicken (Full)", description: "🔴 Wok-tossed spicy chilly chicken (Full Portion).", price: 599, image: getImg("chilly_chicken") },

    // --- RICE (3 items) ---
    { id: 4501, category: "Rice", name: "Plain Rice", description: "🟢 Fluffy, steaming long-grain premium basmati rice.", price: 119, image: getImg("rice") },
    { id: 4502, category: "Rice", name: "Jeera Rice", description: "🟢 Aromatic long-grain basmati rice tempered with roasted cumin seeds and ghee.", price: 169, image: getImg("rice") },
    { id: 4503, category: "Rice", name: "Veg Fried Rice", description: "🟢 Chinese-style wok-tossed basmati rice with finely chopped garden-fresh vegetables.", price: 219, image: getImg("rice") },

    // --- BREADS (4 items) ---
    { id: 4801, category: "Breads", name: "Tawa Roti", description: "🟢 Traditional soft whole-wheat flatbread cooked on griddle.", price: 25, image: getImg("roti") },
    { id: 4802, category: "Breads", name: "Tawa Butter Roti", description: "🟢 Freshly baked whole-wheat tawa roti brushed generously with butter.", price: 30, image: getImg("roti") },
    { id: 4804, category: "Breads", name: "Missi Roti", description: "🟢 Traditional spiced gram flour flatbread baked on tawa.", price: 40, image: getImg("roti") },
    { id: 4803, category: "Breads", name: "Malabar Paratha", description: "🟢 Flaky, soft, layered flatbread from South India cooked to golden brown.", price: 60, image: getImg("paratha") },

    // --- CHEF'S COMBOS & THALIS (2 items) ---
    { id: 3001, category: "Thalis", name: "Veg Combo", description: "🟢 Value single-portion combo featuring creamy Dal Makhani, Jeera Rice, and 2 Tawa Rotis.", price: 249, image: getImg("thali"), isPopular: true },
    { id: 3005, category: "Thalis", name: "Non-Veg Deluxe Thali", description: "🔴 1 Chicken, Rice, 2 Roti, Salad, Pickle, and 1 Papad.", price: 499, image: getImg("thali_nonveg_special") },

    // --- DESSERTS (4 items) ---
    { id: 6001, category: "Sweet Dish", name: "Gulab Jamun (2 pcs)", description: "🟢 Hot golden-fried milk balls soaked in cardamom-rose scented sugar syrup.", price: 109, image: getImg("lassi") },
    { id: 6002, category: "Sweet Dish", name: "Kulfi", description: "🟢 (Stick) Kulfi (Per piece) traditional saffron-cardamom frozen dessert.", price: 99, image: getImg("lassi") },
    { id: 6003, category: "Sweet Dish", name: "Ice Cream (Single Scoop)", description: "🟢 Vanilla ice cream scoop.", price: 99, image: getImg("lassi") },
    { id: 6004, category: "Sweet Dish", name: "Ice Cream (Double Scoop)", description: "🟢 Indulgent double scoop of premium flavored ice cream.", price: 169, image: getImg("lassi") },

    // --- BEVERAGES (11 items) ---
    { id: 7001, category: "Beverages", name: "Tea", description: "🟢 Freshly brewed hot Indian milk tea infused with ginger and cardamom.", price: 50, image: getImg("tea") },
    { id: 7002, category: "Beverages", name: "Coffee", description: "🟢 Rich and creamy hot milk coffee brewed to absolute perfection.", price: 70, image: getImg("tea") },
    { id: 7003, category: "Beverages", name: "Glass of Milk", description: "🟢 Boiled fresh pure buffalo milk served piping hot (sweetened or plain).", price: 70, image: getImg("milk") },
    { id: 7004, category: "Beverages", name: "Lemon Water", description: "🟢 Chilled, refreshing freshly squeezed lemon juice (sweetened, salted, or mixed).", price: 50, image: getImg("soda") },
    { id: 7005, category: "Beverages", name: "Fresh Lemonade", description: "🟢 Refreshing lemonade with soda.", price: 99, image: getImg("soda") },
    { id: 7011, category: "Beverages", name: "Plain Soda", description: "🟢 Chilled glass of carbonated plain soda.", price: 50, image: getImg("soda") },
    { id: 7006, category: "Beverages", name: "Sweet Lassi", description: "🟢 Thick, creamy, churned yogurt sweet drink topped with malai, served chilled.", price: 109, image: getImg("lassi") },
    { id: 7007, category: "Beverages", name: "Salted Lassi", description: "🟢 Savory, refreshing churned yogurt beverage flavored with roasted cumin and salt.", price: 109, image: getImg("lassi") },
    { id: 7008, category: "Beverages", name: "Coke", description: "🟢 Chilled can of carbonated Coca-Cola (250ml).", price: 50, image: getImg("cold_drink") },
    { id: 7009, category: "Beverages", name: "Limca", description: "🟢 Chilled can of fizzy lemon-lime flavored Limca soda (250ml).", price: 50, image: getImg("cold_drink") },
    { id: 7010, category: "Beverages", name: "Mineral Water (1 Ltr)", description: "🟢 Packaged, chilled bottle of purified mineral drinking water (1 Ltr).", price: 50, image: getImg("mineral_water") }
];
