/**
 * HOTEL SKY 5 - AUTHENTIC INDIAN VEG DATABASE (A2Z MASTER LIST)
 * 5-Star Hospitality Grade Imagery
 */

// High-Fidelity Local Assets (Served from 04_Digital_Assets)
const img_paratha = "/images/breakfast_paratha_combo_1770012647403.png";
const img_curry = "/images/paneer_butter_masala_combo_bowl_1770012612956.png"; 
const img_thali = "/images/dal_tadka_combo_thali_1770012594484.png";
const img_dal = "/images/dal_tadka_roti_rice_combo_1770013924380.png";
const img_snacks = "/images/paneer_tikka_skewer_1770013745197.png";
const img_drinks = "/images/fresh_fruit_juices_assorted_1770013780221.png";
const img_noodles = "/images/hakka_noodles_veg_1770013764042.png";
const img_rice = "/images/chilli_paneer_fried_rice_combo_1770012631322.png";

const getImg = (id) => `https://images.unsplash.com/photo-${id}?q=80&w=800`;

export const combos = [
    // --- BREAKFAST ---
    { id: 1001, category: "Breakfast", name: "Aloo Paratha", description: "🟢 Spiced potato stuffed flatbread with butter.", price: 70, image: img_paratha, isPopular: true },
    { id: 1002, category: "Breakfast", name: "Plain Omelette", description: "🟢 Classic fluffy egg omelette.", price: 70, image: img_paratha },
    { id: 1003, category: "Breakfast", name: "Paneer Paratha", description: "🟢 Heritage paratha with cottage cheese.", price: 90, image: img_paratha, isPopular: true },
    { id: 1004, category: "Breakfast", name: "Poha", description: "🟢 Flattened rice with mustard and peanuts.", price: 60, image: getImg("1610192244261-3f33de3f55e4") },
    { id: 1005, category: "Breakfast", name: "Veg Sandwich / Toast / Grilled", description: "🟢 Fresh garden vegetable toast.", price: 100, image: getImg("1525351484163-7529414344d8") },
    { id: 1009, category: "Breakfast", name: "Curd Bowl", description: "🟢 Fresh freshly set thick yogurt.", price: 50, image: getImg("1481931098730-119839ec81e7") },

    // --- SNACKS ---
    { id: 2001, category: "Snacks", name: "Veg Maggi / Cheese Maggi", description: "🟢 Instant hot noodles with cheese.", price: 80, image: img_noodles },
    { id: 2003, category: "Snacks", name: "Masala / Roast Papad", description: "🟢 Crispy lentil wafers with spices.", price: 80, image: img_rice },
    { id: 2004, category: "Snacks", name: "Mix Pakora (12 Pcs)", description: "🟢 Assorted vegetable fritters.", price: 150, image: getImg("1512621776951-a57141f2eefd"), isPopular: true },
    { id: 2005, category: "Snacks", name: "Cheese Chilli (Dry)", description: "🟢 Cottage cheese with peppers.", price: 200, image: img_curry },
    { id: 2011, category: "Snacks", name: "Paneer Pakoda", description: "🟢 Batter-fried spicy cottage cheese.", price: 150, image: img_snacks },

    // --- CHINESE ---
    { id: 2501, category: "Chinese", name: "Veg Hakka Noodles / Fried Rice", description: "🟢 Indian-style wok-tossed noodles or rice.", price: 150, image: img_noodles },
    { id: 2502, category: "Chinese", name: "Chilly Potato / Paneer", description: "🟢 Crispy wok-tossed starter.", price: 150, image: getImg("1512621776951-a57141f2eefd") },

    // --- THALIS ---
    { id: 3001, category: "Thalis", name: "Veg Thali", description: "🟢 4 Roti, Rice, Dal, Mix Veg, Raita, Salad, Achar", price: 210, image: img_thali, isPopular: true },
    { id: 3002, category: "Thalis", name: "Delux Thali (Veg)", description: "🟢 4 Roti, Rice, Dal Makhani, Sahi Paneer, Raita, Salad, Achar", price: 250, image: img_thali, isPopular: true },
    { id: 3003, category: "Thalis", name: "Non-Veg Thali", description: "🔴 4 Roti, Rice, Chicken Curry, Raita, Salad, Achar", price: 350, image: img_thali },
    { id: 3004, category: "Thalis", name: "Special NV Thali", description: "🔴 4 Roti, Rice, Butter Chicken, Raita, Salad, Achar", price: 400, image: img_thali },

    // --- MAIN COURSE ---
    { id: 4001, category: "Main Course", name: "Dal Makhani", description: "🟢 Slow-cooked creamy black lentils.", price: 220, image: img_dal, isPopular: true },
    { id: 4002, category: "Main Course", name: "Kadhai Paneer", description: "🟢 Spicy cottage cheese with bell peppers.", price: 280, image: img_curry, isPopular: true },
    { id: 4003, category: "Main Course", name: "Paneer Butter Masala", description: "🟢 Creamy rich tomato gravy with cottage cheese.", price: 300, image: img_curry },
    { id: 4004, category: "Main Course", name: "Mix Vegetable / Chana Masala", description: "🟢 Assorted vegetables in Indian spices.", price: 200, image: img_curry },
    { id: 4005, category: "Main Course", name: "Butter Chicken", description: "🔴 Tandoori chicken in tomato gravy.", price: 400, image: img_curry },
    { id: 4006, category: "Main Course", name: "Chicken Curry", description: "🔴 Traditional Indian chicken curry.", price: 400, image: img_curry },
    { id: 4007, category: "Main Course", name: "Chilly Chicken", description: "🔴 Indo-Chinese dry chilly chicken.", price: 400, image: img_curry },

    // --- RICE ---
    { id: 4501, category: "Rice", name: "Plain Rice / Jeera Rice", description: "🟢 Aromatic steamed basmati rice.", price: 120, image: img_rice },
    { id: 4502, category: "Rice", name: "Veg Biryani", description: "🟢 Spiced fragrant rice layered with vegetables.", price: 220, image: img_rice, isPopular: true },
    { id: 4503, category: "Rice", name: "Peas Pulao / Fried Rice", description: "🟢 Basmati rice tossed with green peas.", price: 180, image: img_rice },

    // --- BREADS ---
    { id: 4801, category: "Breads", name: "Tawa Roti", description: "🟢 Whole wheat flatbread.", price: 25, image: img_paratha },
    { id: 4802, category: "Breads", name: "Butter Roti", description: "🟢 Whole wheat flatbread with butter.", price: 30, image: img_paratha },
    { id: 4803, category: "Breads", name: "Tawa Paratha", description: "🟢 Layered whole wheat flatbread.", price: 40, image: img_paratha },

    // --- RAITA & SALAD ---
    { id: 5001, category: "Raita & Salad", name: "Russian Salad", description: "🟢 Creamy fruit and veg salad.", price: 150, image: getImg("1512621776951-a57141f2eefd") },
    { id: 5002, category: "Raita & Salad", name: "Kachumber / Green Salad", description: "🟢 Fresh garden vegetables.", price: 70, image: getImg("1512621776951-a57141f2eefd") },

    // --- BEVERAGES ---
    { id: 8001, category: "Beverages", name: "Fresh Lime Soda / Water", description: "🟢 Chilled refreshing soda with lime.", price: 100, image: img_drinks },
    { id: 8002, category: "Beverages", name: "Cold Drink (500ml) / Soda (200ml)", description: "🟢 Assorted aerated drinks.", price: 60, image: img_drinks },
    { id: 8003, category: "Beverages", name: "Hot Tea / Coffee", description: "🟢 Masala ginger tea or roasted coffee.", price: 50, image: getImg("1544787210-22bb64215754") },
    { id: 8004, category: "Beverages", name: "Amul / Coke (250ml)", description: "🟢 Bottled beverages.", price: 30, image: img_drinks },

    // --- COMBOS ---
    { id: 9001, category: "Smart Combos", name: "Early Bird Combo", description: "🟢 2 Paratha + Tea. Perfect start.", price: 129, image: img_paratha, isPopular: true },
    { id: 9002, category: "Smart Combos", name: "Executive Thali", description: "🟢 Deluxe Thali + Sweet Lassi.", price: 329, image: img_thali, isPopular: true }
];
