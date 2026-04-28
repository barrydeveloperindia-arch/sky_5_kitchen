/**
 * HOTEL SKY 5 - AUTHENTIC INDIAN VEG DATABASE (A2Z MASTER LIST)
 * 5-Star Hospitality Grade Imagery (Pexels Stable Links)
 */

const getImg = (type) => {
    const urls = {
        breakfast: "https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?auto=compress&cs=tinysrgb&w=800",
        snacks: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800",
        thali: "https://images.pexels.com/photos/2611917/pexels-photo-2611917.jpeg?auto=compress&cs=tinysrgb&w=800",
        main: "https://images.pexels.com/photos/2474658/pexels-photo-2474658.jpeg?auto=compress&cs=tinysrgb&w=800",
        rice: "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?auto=compress&cs=tinysrgb&w=800",
        tea: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=800",
        milk: "https://images.pexels.com/photos/2480828/pexels-photo-2480828.jpeg?auto=compress&cs=tinysrgb&w=800",
        soda: "https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=800",
        water: "https://images.pexels.com/photos/1346155/pexels-photo-1346155.jpeg?auto=compress&cs=tinysrgb&w=800"
    };
    return urls[type] || urls.main;
};

export const combos = [
    // --- BREAKFAST ---
    { id: 1001, category: "Breakfast", name: "Aloo Paratha (1 PC)", description: "🟢 Spiced potato stuffed flatbread.", price: 70, image: getImg("breakfast"), isPopular: true },
    { id: 1002, category: "Breakfast", name: "Gobhi Paratha (1 PC)", description: "🟢 Cauliflower stuffed flatbread.", price: 70, image: getImg("breakfast") },
    { id: 1003, category: "Breakfast", name: "Mix Paratha (1 PC)", description: "🟢 Mixed vegetable stuffed flatbread.", price: 80, image: getImg("breakfast") },
    { id: 1004, category: "Breakfast", name: "Onion Paratha (1 PC)", description: "🟢 Onion stuffed flatbread.", price: 70, image: getImg("breakfast") },
    { id: 1005, category: "Breakfast", name: "Paneer Paratha", description: "🟢 Cottage cheese stuffed paratha.", price: 90, image: getImg("breakfast"), isPopular: true },
    { id: 1006, category: "Breakfast", name: "Bread Toast (4 PCS)", description: "🟢 Crisp toasted bread.", price: 60, image: getImg("snacks") },
    { id: 1007, category: "Breakfast", name: "Veg Sandwich (4 PCS)", description: "🟢 Fresh garden vegetable sandwich.", price: 100, image: getImg("snacks") },
    { id: 1008, category: "Breakfast", name: "Boiled Egg (2 PCS)", description: "🔴 Protein rich boiled eggs.", price: 60, image: getImg("breakfast") },
    { id: 1009, category: "Breakfast", name: "Bread Omelette (2 PCS)", description: "🔴 Classic street style bread omelette.", price: 80, image: getImg("breakfast") },
    { id: 1010, category: "Breakfast", name: "Plain Omelette", description: "🔴 Classic fluffy egg omelette.", price: 70, image: getImg("breakfast") },
    { id: 1011, category: "Breakfast", name: "Masala Omelette", description: "🔴 Spiced Indian omelette.", price: 90, image: getImg("breakfast") },
    { id: 1012, category: "Breakfast", name: "Poha (1 Small Bowl)", description: "🟢 Flattened rice with mustard and peanuts.", price: 60, image: getImg("breakfast") },
    { id: 1013, category: "Breakfast", name: "Curd / Bowl", description: "🟢 Freshly set thick yogurt.", price: 50, image: getImg("milk") },
    { id: 1014, category: "Breakfast", name: "Butter 10GM", description: "🟢 Creamy rich butter portion.", price: 20, image: getImg("breakfast") },

    // --- SNACKS ---
    { id: 2001, category: "Snacks", name: "Mix Pakora (12 PCS)", description: "🟢 Assorted vegetable fritters.", price: 150, image: getImg("snacks"), isPopular: true },
    { id: 2002, category: "Snacks", name: "Paneer Pakora (8 PCS)", description: "🟢 Batter-fried spicy cottage cheese.", price: 150, image: getImg("snacks") },
    { id: 2003, category: "Snacks", name: "French Fries", description: "🟢 Crispy golden potato fries.", price: 120, image: getImg("snacks") },
    { id: 2004, category: "Snacks", name: "Masala / Roast Papad", description: "🟢 Crispy lentil wafers with spices.", price: 80, image: getImg("snacks") },
    { id: 2005, category: "Snacks", name: "Veg Sandwich / Toast / Grilled", description: "🟢 Grilled vegetable sandwich.", price: 100, image: getImg("snacks") },
    { id: 2006, category: "Snacks", name: "Veg Maggi / Cheese Maggi", description: "🟢 Instant hot noodles.", price: 80, image: getImg("snacks") },
    { id: 2007, category: "Snacks", name: "Cheese Chilli (Dry)", description: "🟢 Cottage cheese with peppers.", price: 200, image: getImg("main") },
    { id: 2008, category: "Snacks", name: "Peanut Masala", description: "🟢 Roasted peanuts tossed with spices.", price: 120, image: getImg("snacks") },

    // --- CHINESE ---
    { id: 2501, category: "Chinese", name: "Veg Fried Rice", description: "🟢 Wok-tossed seasoned rice.", price: 150, image: getImg("rice") },
    { id: 2502, category: "Chinese", name: "Veg Hakka Noodles", description: "🟢 Indian-style wok-tossed noodles.", price: 150, image: getImg("snacks") },
    { id: 2503, category: "Chinese", name: "Chilly Potato / Paneer", description: "🟢 Crispy wok-tossed starter.", price: 150, image: getImg("main") },

    // --- THALIS ---
    { id: 3001, category: "Thalis", name: "Veg Thali", description: "🟢 4 Roti, Rice, Dal, Mix Veg, Raita, Salad, Achar", price: 210, image: getImg("thali"), isPopular: true },
    { id: 3002, category: "Thalis", name: "Delux Thali (Veg)", description: "🟢 4 Roti, Rice, Dal Makhani, Sahi Paneer, Raita, Salad", price: 250, image: getImg("thali"), isPopular: true },
    { id: 3003, category: "Thalis", name: "Non-Veg Thali", description: "🔴 4 Roti, Rice, Chicken Curry, Raita, Salad, Achar", price: 350, image: getImg("thali") },
    { id: 3004, category: "Thalis", name: "Special NV Thali", description: "🔴 4 Roti, Rice, Butter Chicken, Raita, Salad, Achar", price: 400, image: getImg("thali") },

    // --- MAIN COURSE ---
    { id: 4001, category: "Main Course", name: "Dal Makhani", description: "🟢 Slow-cooked creamy black lentils.", price: 220, image: getImg("main"), isPopular: true },
    { id: 4002, category: "Main Course", name: "Kadhai Paneer", description: "🟢 Spicy cottage cheese with bell peppers.", price: 280, image: getImg("main"), isPopular: true },
    { id: 4003, category: "Main Course", name: "Paneer Butter Masala", description: "🟢 Creamy rich tomato gravy with cottage cheese.", price: 300, image: getImg("main") },
    { id: 4004, category: "Main Course", name: "Mix Vegetable / Chana Masala", description: "🟢 Assorted vegetables in Indian spices.", price: 200, image: getImg("main") },
    { id: 4005, category: "Main Course", name: "Butter Chicken", description: "🔴 Tandoori chicken in tomato gravy.", price: 400, image: getImg("main") },
    { id: 4006, category: "Main Course", name: "Chicken Curry", description: "🔴 Traditional Indian chicken curry.", price: 400, image: getImg("main") },
    { id: 4007, category: "Main Course", name: "Chilly Chicken", description: "🔴 Indo-Chinese dry chilly chicken.", price: 400, image: getImg("main") },

    // --- RICE ---
    { id: 4501, category: "Rice", name: "Plain Rice / Jeera Rice", description: "🟢 Aromatic steamed basmati rice.", price: 120, image: getImg("rice") },
    { id: 4502, category: "Rice", name: "Veg Biryani", description: "🟢 Spiced fragrant rice layered with vegetables.", price: 220, image: getImg("rice"), isPopular: true },
    { id: 4503, category: "Rice", name: "Peas Pulao / Fried Rice", description: "🟢 Basmati rice tossed with green peas.", price: 180, image: getImg("rice") },

    // --- BREADS ---
    { id: 4801, category: "Breads", name: "Tawa Roti", description: "🟢 Whole wheat flatbread.", price: 25, image: getImg("breakfast") },
    { id: 4802, category: "Breads", name: "Butter Roti", description: "🟢 Whole wheat flatbread with butter.", price: 30, image: getImg("breakfast") },
    { id: 4803, category: "Breads", name: "Tawa Paratha", description: "🟢 Layered whole wheat flatbread.", price: 40, image: getImg("breakfast") },

    // --- RAITA & SALAD ---
    { id: 5001, category: "Raita & Salad", name: "Russian Salad", description: "🟢 Creamy fruit and veg salad.", price: 150, image: getImg("snacks") },
    { id: 5002, category: "Raita & Salad", name: "Kachumber / Green Salad", description: "🟢 Fresh garden vegetables.", price: 90, image: getImg("snacks") },

    // --- BEVERAGES ---
    { id: 8001, category: "Beverages", name: "Tea / Coffee", description: "🟢 Hot stimulating beverage.", price: 50, image: getImg("tea") },
    { id: 8002, category: "Beverages", name: "Milk (1 Glass)", description: "🟢 Warm glass of milk.", price: 60, image: getImg("milk") },
    { id: 8003, category: "Beverages", name: "Sweet Lassi (Steel Glass)", description: "🟢 Chilled sweet yogurt drink.", price: 100, image: getImg("milk") },
    { id: 8004, category: "Beverages", name: "Fresh Lime Soda / Water", description: "🟢 Chilled refreshing lime drink.", price: 100, image: getImg("soda") },
    { id: 8005, category: "Beverages", name: "Cold Drink (500 ML) / Soda (200 ML)", description: "🟢 Assorted aerated drinks.", price: 60, image: getImg("soda") },
    { id: 8006, category: "Beverages", name: "Amul / Coke (250 ML)", description: "🟢 Bottled beverages.", price: 30, image: getImg("soda") },
    { id: 8007, category: "Beverages", name: "Mineral Water (1 LTR)", description: "🟢 Packaged drinking water.", price: 50, image: getImg("water") }
];
