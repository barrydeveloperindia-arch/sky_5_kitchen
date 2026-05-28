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
    // --- BREAKFAST (4 items) ---
    { id: 1001, category: "Breakfast", name: "Aloo Puri", description: "🟢 Crispy fried wheat flatbreads (puris) served with spiced potato curry.", price: 120, image: getImg("paratha"), isPopular: true },
    { id: 1002, category: "Breakfast", name: "Paranthas (Aloo, Paneer, Gobhi, Mix)", description: "🟢 Stuffed flatbread served with fresh curd and spicy pickle.", price: 90, image: getImg("paratha"), isPopular: true },
    { id: 1003, category: "Breakfast", name: "Vegetarian sandwich (cold)", description: "🟢 Chilled double-decker sandwich with fresh vegetables and green chutney spread.", price: 100, image: getImg("sandwich") },
    { id: 1004, category: "Breakfast", name: "Egg (scrambled eggs, Bhurji, omelete, masala omelete)", description: "🔴 Fresh eggs cooked to your preference: scrambled, Indian bhurji style, or classic omelette.", price: 80, image: getImg("omelette") },

    // --- SNACKS (9 items) ---
    { id: 2001, category: "Snacks", name: "Mix Pakora", description: "🟢 Crispy batter-fried spiced mixed vegetables.", price: 150, image: getImg("snacks"), isPopular: true },
    { id: 2002, category: "Snacks", name: "Dry Machurian", description: "🟢 Indo-Chinese fried vegetable balls tossed in a dark, savory soy-garlic glaze.", price: 160, image: getImg("snacks") },
    { id: 2004, category: "Snacks", name: "Peanut Masala", description: "🟢 Zesty roasted peanuts tossed with finely chopped onions, tomatoes, and lemon dressing.", price: 120, image: getImg("snacks") },
    { id: 2005, category: "Snacks", name: "French Fries", description: "🟢 Classic golden potato fries served hot and crispy.", price: 120, image: getImg("fries") },
    { id: 2008, category: "Snacks", name: "Honey Chilli Potato", description: "🟢 Wok-tossed sweet & spicy glazed potato fingers.", price: 150, image: getImg("fries") },
    { id: 2006, category: "Snacks", name: "Papad (Plain and Masala)", description: "🟢 Crispy roasted thin lentil disc served plain or topped with spiced onion-tomato salsa.", price: 80, image: getImg("snacks") },
    { id: 2009, category: "Snacks", name: "Chicken Pakora", description: "🔴 Crispy batter-fried spiced chicken pieces.", price: 200, image: getImg("snacks") },
    { id: 2003, category: "Snacks", name: "Chicken Tikka", description: "🔴 Tandoor-grilled marinated chicken chunks seasoned with aromatic clay-oven spices.", price: 280, image: getImg("snacks"), isPopular: true },
    { id: 2007, category: "Snacks", name: "Fried chicken", description: "🔴 Crispy golden breaded and deep-fried tender chicken pieces served with spicy dip.", price: 240, image: getImg("chilly_chicken") },

    // --- CHINESE (2 items) ---
    { id: 2502, category: "Chinese", name: "Veg. Hakka Noodles", description: "🟢 Chinese-style stir-fried thin noodles with crisp veggies and savory Indo-Chinese spices.", price: 150, image: getImg("noodles") },
    { id: 2503, category: "Chinese", name: "Veg. Manchurian Gravy", description: "🟢 Crisp vegetable dumplings simmered in a rich, tangy ginger-garlic soy gravy.", price: 160, image: getImg("paneer") },

    // --- THALIS (2 items) ---
    { id: 3001, category: "Thalis", name: "Veg. Delux", description: "🟢 Complete thali featuring 4 Roti, Rice, Dal Makhani, Paneer Makhani, Raita, and Salad.", price: 250, image: getImg("thali_deluxe"), isPopular: true },
    { id: 3002, category: "Thalis", name: "Non veg Butter Chicken", description: "🔴 Premium thali featuring 4 Roti, Rice, Butter Chicken gravy, Raita, Salad, and Pickle.", price: 400, image: getImg("thali_nonveg_special"), isPopular: true },

    // --- VEGETARIAN MAIN DISHES (5 items) ---
    { id: 4001, category: "Main Course", name: "Dal Makhani", description: "🟢 Slow-cooked creamy black lentils simmered overnight with butter and fresh cream.", price: 220, image: getImg("dal"), isPopular: true },
    { id: 4002, category: "Main Course", name: "Yellow Dal Tadka", description: "🟢 Wholesome yellow lentils tempered with ghee, cumin seeds, garlic, and red chillies.", price: 180, image: getImg("dal") },
    { id: 4003, category: "Main Course", name: "Karahi Paneer", description: "🟢 Cottage cheese chunks cooked with bell peppers and fresh ground spices in a wok.", price: 280, image: getImg("paneer"), isPopular: true },
    { id: 4004, category: "Main Course", name: "Paneer Makhani", description: "🟢 Soft paneer cubes simmered in a smooth, mildly sweet, and buttery tomato gravy.", price: 300, image: getImg("paneer_butter_masala") },
    { id: 4005, category: "Main Course", name: "Chana Masala", description: "🟢 Spicy, tangy chickpeas cooked in a rich blend of onion, tomato, and Punjabi spices.", price: 200, image: getImg("mix_veg") },

    // --- NON-VEGETARIAN MAIN DISHES (3 items) ---
    { id: 4101, category: "Main Course", name: "Butter Chicken / Karahi Chicken", description: "🔴 Tandoori grilled chicken pieces in rich tomato butter cream gravy or spicy wok-cooked style.", price: 400, image: getImg("butter_chicken"), isPopular: true },
    { id: 4102, category: "Main Course", name: "Egg curry", description: "🔴 Hard-boiled eggs simmered in a spiced tomato-onion curry gravy.", price: 240, image: getImg("egg") },
    { id: 4103, category: "Main Course", name: "Chicken Bryani", description: "🔴 Layered basmati rice and tandoor-marinated chicken cooked with spices and herbs.", price: 350, image: getImg("rice") },

    // --- RICE ITEMS (3 rice items) ---
    { id: 4501, category: "Rice", name: "Jeera Rice", description: "🟢 Fragrant steamed basmati rice lightly tossed with roasted cumin seeds and ghee.", price: 120, image: getImg("rice") },
    { id: 4502, category: "Rice", name: "Vegetarian Bryani", description: "🟢 Spiced fragrant rice layered with fresh vegetables and aromatic herbs.", price: 220, image: getImg("rice"), isPopular: true },
    { id: 2501, category: "Rice", name: "Vegetarian fried rice", description: "🟢 Stir-fried fluffy basmati rice with finely chopped garden vegetables and soy sauce.", price: 150, image: getImg("rice") },

    // --- BREADS (2 items) ---
    { id: 4801, category: "Breads", name: "Roti", description: "🟢 Freshly puffed griddle-cooked whole wheat flatbread, served plain or with butter.", price: 20, image: getImg("roti") },
    { id: 4804, category: "Breads", name: "Malabor Parantha", description: "🟢 Multi-layered, flaky, and soft wheat flatbread cooked to a golden crisp.", price: 50, image: getImg("paratha") },

    // --- SALAD (2 items) ---
    { id: 5001, category: "Salad", name: "tomato, onion and cucumber", description: "🟢 Freshly sliced cucumber, garden tomatoes, onions, carrots, and green chillies.", price: 80, image: getImg("salad") },
    { id: 5002, category: "Salad", name: "Chickpeas salad", description: "🟢 Tangy, sweet, and spicy street-style potato and chickpea salad with fresh herbs.", price: 100, image: getImg("salad") },

    // --- SWEET DISH (2 items) ---
    { id: 6001, category: "Sweet Dish", name: "Ice cream cups", description: "🟢 Refreshing chilled vanilla or chocolate ice cream cup.", price: 80, image: getImg("lassi") },
    { id: 6002, category: "Sweet Dish", name: "Kulfi", description: "🟢 Traditional rich, creamy Indian frozen dessert.", price: 80, image: getImg("lassi") }
];
