/**
 * HOTEL SKY 5 - AUTHENTIC INDIAN VEG DATABASE (A2Z MASTER LIST)
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
    // --- BREAKFAST ---
    { id: 1001, category: "Breakfast", name: "Aloo Paratha (1 PC)", description: "🟢 Spiced potato stuffed flatbread.", price: 70, image: getImg("paratha"), isPopular: true },
    { id: 1002, category: "Breakfast", name: "Gobhi Paratha (1 PC)", description: "🟢 Cauliflower stuffed flatbread.", price: 70, image: getImg("paratha") },
    { id: 1003, category: "Breakfast", name: "Mix Paratha (1 PC)", description: "🟢 Mixed vegetable stuffed flatbread.", price: 80, image: getImg("paratha") },
    { id: 1004, category: "Breakfast", name: "Onion Paratha (1 PC)", description: "🟢 Onion stuffed flatbread.", price: 70, image: getImg("paratha") },
    { id: 1005, category: "Breakfast", name: "Paneer Paratha", description: "🟢 Cottage cheese stuffed paratha.", price: 90, image: getImg("paratha"), isPopular: true },
    { id: 1006, category: "Breakfast", name: "Bread Toast (4 PCS)", description: "🟢 Crisp toasted bread.", price: 60, image: getImg("toast") },
    { id: 1007, category: "Breakfast", name: "Veg Sandwich (4 PCS)", description: "🟢 Fresh garden vegetable sandwich.", price: 100, image: getImg("sandwich") },
    { id: 1008, category: "Breakfast", name: "Boiled Egg (2 PCS)", description: "🔴 Protein rich boiled eggs.", price: 60, image: getImg("egg") },
    { id: 1009, category: "Breakfast", name: "Bread Omelette (2 PCS)", description: "🔴 Classic street style bread omelette.", price: 80, image: getImg("omelette") },
    { id: 1010, category: "Breakfast", name: "Plain Omelette", description: "🔴 Classic fluffy egg omelette.", price: 70, image: getImg("omelette") },
    { id: 1011, category: "Breakfast", name: "Masala Omelette", description: "🔴 Spiced Indian omelette.", price: 90, image: getImg("omelette") },
    { id: 1012, category: "Breakfast", name: "Poha (1 Small Bowl)", description: "🟢 Flattened rice with mustard and peanuts.", price: 60, image: getImg("poha") },
    { id: 1013, category: "Breakfast", name: "Curd / Bowl", description: "🟢 Freshly set thick yogurt.", price: 50, image: getImg("lassi") },
    { id: 1014, category: "Breakfast", name: "Butter 10GM", description: "🟢 Creamy rich butter portion.", price: 20, image: getImg("paratha") },

    // --- SNACKS ---
    { id: 2001, category: "Snacks", name: "Mix Pakora (12 PCS)", description: "🟢 Assorted vegetable fritters.", price: 150, image: getImg("snacks"), isPopular: true },
    { id: 2002, category: "Snacks", name: "Paneer Pakora (8 PCS)", description: "🟢 Batter-fried spicy cottage cheese.", price: 150, image: getImg("snacks") },
    { id: 2003, category: "Snacks", name: "French Fries", description: "🟢 Crispy golden potato fries.", price: 120, image: getImg("fries") },
    { id: 2004, category: "Snacks", name: "Masala / Roast Papad", description: "🟢 Crispy lentil wafers with spices.", price: 80, image: getImg("snacks") },
    { id: 2005, category: "Snacks", name: "Veg Sandwich / Toast / Grilled", description: "🟢 Grilled vegetable sandwich.", price: 100, image: getImg("sandwich") },
    { id: 2006, category: "Snacks", name: "Veg Maggi / Cheese Maggi", description: "🟢 Instant hot noodles.", price: 80, image: getImg("noodles") },
    { id: 2007, category: "Snacks", name: "Cheese Chilli (Dry)", description: "🟢 Cottage cheese with peppers.", price: 200, image: getImg("paneer") },
    { id: 2008, category: "Snacks", name: "Peanut Masala", description: "🟢 Roasted peanuts tossed with spices.", price: 120, image: getImg("snacks") },

    // --- CHINESE ---
    { id: 2501, category: "Chinese", name: "Veg Fried Rice", description: "🟢 Wok-tossed seasoned rice.", price: 150, image: getImg("rice") },
    { id: 2502, category: "Chinese", name: "Veg Hakka Noodles", description: "🟢 Indian-style wok-tossed noodles.", price: 150, image: getImg("noodles") },
    { id: 2503, category: "Chinese", name: "Chilly Potato / Paneer", description: "🟢 Crispy wok-tossed starter.", price: 150, image: getImg("paneer") },

    // --- THALIS ---
    { id: 3001, category: "Thalis", name: "Veg Thali", description: "🟢 4 Roti, Rice, Dal, Mix Veg, Raita, Salad, Achar", price: 210, image: getImg("thali"), isPopular: true },
    { id: 3002, category: "Thalis", name: "Delux Thali (Veg)", description: "🟢 4 Roti, Rice, Dal Makhani, Sahi Paneer, Raita, Salad", price: 250, image: getImg("thali_deluxe"), isPopular: true },
    { id: 3003, category: "Thalis", name: "Non-Veg Thali", description: "🔴 4 Roti, Rice, Chicken Curry, Raita, Salad, Achar", price: 350, image: getImg("thali_nonveg") },
    { id: 3004, category: "Thalis", name: "Special NV Thali", description: "🔴 4 Roti, Rice, Butter Chicken, Raita, Salad, Achar", price: 400, image: getImg("thali_nonveg_special") },

    // --- MAIN COURSE ---
    { id: 4001, category: "Main Course", name: "Dal Makhani", description: "🟢 Slow-cooked creamy black lentils.", price: 220, image: getImg("dal"), isPopular: true },
    { id: 4002, category: "Main Course", name: "Kadhai Paneer", description: "🟢 Spicy cottage cheese with bell peppers.", price: 280, image: getImg("paneer"), isPopular: true },
    { id: 4003, category: "Main Course", name: "Paneer Butter Masala", description: "🟢 Creamy rich tomato gravy with cottage cheese.", price: 300, image: getImg("paneer_butter_masala") },
    { id: 4004, category: "Main Course", name: "Mix Vegetable / Chana Masala", description: "🟢 Assorted vegetables in Indian spices.", price: 200, image: getImg("mix_veg") },
    { id: 4005, category: "Main Course", name: "Butter Chicken", description: "🔴 Tandoori chicken in tomato gravy.", price: 400, image: getImg("butter_chicken") },
    { id: 4006, category: "Main Course", name: "Chicken Curry", description: "🔴 Traditional Indian chicken curry.", price: 400, image: getImg("chicken_curry") },
    { id: 4007, category: "Main Course", name: "Chilly Chicken", description: "🔴 Indo-Chinese dry chilly chicken.", price: 400, image: getImg("chilly_chicken") },

    // --- RICE ---
    { id: 4501, category: "Rice", name: "Plain Rice / Jeera Rice", description: "🟢 Aromatic steamed basmati rice.", price: 120, image: getImg("rice") },
    { id: 4502, category: "Rice", name: "Veg Biryani", description: "🟢 Spiced fragrant rice layered with vegetables.", price: 220, image: getImg("rice"), isPopular: true },
    { id: 4503, category: "Rice", name: "Peas Pulao / Fried Rice", description: "🟢 Basmati rice tossed with green peas.", price: 180, image: getImg("rice") },

    // --- BREADS ---
    { id: 4801, category: "Breads", name: "Tawa Roti", description: "🟢 Whole wheat flatbread.", price: 25, image: getImg("roti") },
    { id: 4802, category: "Breads", name: "Butter Roti", description: "🟢 Whole wheat flatbread with butter.", price: 30, image: getImg("roti") },
    { id: 4803, category: "Breads", name: "Tawa Paratha", description: "🟢 Layered whole wheat flatbread.", price: 40, image: getImg("paratha") },

    // --- RAITA & SALAD ---
    { id: 5001, category: "Raita & Salad", name: "Russian Salad", description: "🟢 Creamy fruit and veg salad.", price: 150, image: getImg("salad") },
    { id: 5002, category: "Raita & Salad", name: "Kachumber / Green Salad", description: "🟢 Fresh garden vegetables.", price: 90, image: getImg("salad") },

    // --- BEVERAGES ---
    { id: 8001, category: "Beverages", name: "Tea / Coffee", description: "🟢 Hot stimulating beverage.", price: 50, image: getImg("tea") },
    { id: 8002, category: "Beverages", name: "Milk (1 Glass)", description: "🟢 Warm glass of milk.", price: 60, image: getImg("milk") },
    { id: 8003, category: "Beverages", name: "Sweet Lassi (Steel Glass)", description: "🟢 Chilled sweet yogurt drink.", price: 100, image: getImg("lassi") },
    { id: 8004, category: "Beverages", name: "Fresh Lime Soda / Water", description: "🟢 Chilled refreshing lime drink.", price: 100, image: getImg("soda") },
    { id: 8005, category: "Beverages", name: "Cold Drink (500 ML) / Soda (200 ML)", description: "🟢 Assorted aerated drinks.", price: 60, image: getImg("cold_drink") },
    { id: 8006, category: "Beverages", name: "Amul / Coke (250 ML)", description: "🟢 Bottled beverages.", price: 30, image: getImg("amul_coke") },
    { id: 8007, category: "Beverages", name: "Mineral Water (1 LTR)", description: "🟢 Packaged drinking water.", price: 50, image: getImg("mineral_water") }
];
