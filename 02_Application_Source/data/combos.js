/**
 * HOTEL SKY 5 - AUTHENTIC INDIAN VEG DATABASE (A2Z MASTER LIST)
 * 5-Star Hospitality Grade Imagery
 */

const getImg = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=800`;

// Vetted Industrial-Grade Indian Food IDs for 5-Star Menu
const img_paratha = getImg("1541544741938-0af808871cc0"); // Authentic Aloo Paratha (verified)
const img_curry = getImg("1611754764115-30fa00030588");    // Rich Paneer Curry
const img_thali = getImg("1589302168068-964664d93dc0");    // Traditional Indian Thali
const img_dal = getImg("1546833999-b9f581a1996d");      // Black Dal Makhni
const img_snacks = getImg("1601050638914-72200448e0d6");   // Samosa/Pakoda 
const img_drinks = getImg("1571115177098-24ec42ed204d");   // Shakes/Lassi
const img_noodles = getImg("1585032226651-759b368d7246");  // Desi Chinese
const img_rice = getImg("1603133872878-684f208fb84b");     // Basmati Fried Rice

export const combos = [
    // --- BREAKFAST ---
    { id: 1001, category: "Breakfast", name: "Aloo Paratha", description: "🟢 Spiced potato stuffed flatbread with butter.", price: 60, image: img_paratha, isPopular: true },
    { id: 1002, category: "Breakfast", name: "Plain Paratha", description: "🟢 Classic whole wheat flaky paratha.", price: 50, image: img_paratha },
    { id: 1003, category: "Breakfast", name: "Paneer Paratha", description: "🟢 Heritage paratha with cottage cheese.", price: 99, image: img_paratha, isPopular: true },
    { id: 1004, category: "Breakfast", name: "Poha", description: "🟢 Flattened rice with mustard and peanuts.", price: 90, image: getImg("1610192244261-3f33de3f55e4") },
    { id: 1005, category: "Breakfast", name: "Veg Sandwich", description: "🟢 Fresh garden vegetable toast.", price: 100, image: getImg("1525351484163-7529414344d8") },
    { id: 1009, category: "Breakfast", name: "Curd Bowl", description: "🟢 Fresh freshly set thick yogurt.", price: 50, image: getImg("1481931098730-119839ec81e7") },

    // --- SNACKS ---
    { id: 2001, category: "Snacks", name: "Veg Noodles", description: "🟢 Indian-style wok-tossed noodles.", price: 120, image: img_noodles },
    { id: 2003, category: "Snacks", name: "Veg Fried Rice", description: "🟢 Fragrant rice with garden vegetables.", price: 160, image: img_rice },
    { id: 2004, category: "Snacks", name: "Manchurian", description: "🟢 Crispy veg balls in spicy soya sauce.", price: 200, image: getImg("1512621776951-a57141f2eefd") },
    { id: 2005, category: "Snacks", name: "Chilli Cheese", description: "🟢 Cottage cheese with peppers.", price: 200, image: img_curry },
    { id: 2011, category: "Snacks", name: "Paneer Pakoda", description: "🟢 Batter-fried spicy cottage cheese.", price: 200, image: img_snacks },

    // --- THALIS ---
    { id: 3001, category: "Thalis", name: "Special Thali", description: "🟢 4 Roti, Rice, Dal Tadka, Mix Veg, Raita, Salad.", price: 240, image: img_thali, isPopular: true },
    { id: 3002, category: "Thalis", name: "Deluxe Thali", description: "🟢 Dal Makhni, Jeera Rice, Paneer Butter Masala, Raita.", price: 280, image: img_thali, isPopular: true },

    // --- MAIN COURSE ---
    { id: 4001, category: "Main Course", name: "Paneer Butter Masala", description: "🟢 Creamy rich tomato gravy with cottage cheese.", price: 250, image: img_curry, isPopular: true },
    { id: 4002, category: "Main Course", name: "Dal Makhni", description: "🟢 Slow-cooked creamy black lentils.", price: 200, image: img_dal },
    { id: 4005, category: "Main Course", name: "Dal Tadka", description: "🟢 Yellow lentils tempered with ghee.", price: 180, image: img_dal },

    // --- BEVERAGES ---
    { id: 8001, category: "Beverages", name: "Lassi (Sweet/Salted)", description: "🟢 Creamy whipped chilled churned yogurt.", price: 100, image: img_drinks },
    { id: 8003, category: "Beverages", name: "Hot Tea / Coffee", description: "🟢 Masala ginger tea or roasted coffee.", price: 50, image: getImg("1544787210-22bb64215754") },

    // --- COMBOS ---
    { id: 9001, category: "Smart Combos", name: "Early Bird Combo", description: "🟢 2 Paratha + Tea. Perfect start.", price: 129, image: img_paratha, isPopular: true },
    { id: 9002, category: "Smart Combos", name: "Executive Thali", description: "🟢 Deluxe Thali + Sweet Lassi.", price: 329, image: img_thali, isPopular: true }
];
