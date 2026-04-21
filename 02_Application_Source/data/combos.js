const getImg = (id) => `https://images.unsplash.com/photo-${id}?q=80&w=800&auto=format&fit=crop`;

const img_paratha = getImg("1631589172017-063db13a3754"); // Real paratha
const img_sandwich = getImg("1525351484163-7529414344d8");
const img_omelette = getImg("1510693206972-df098062cb71");
const img_noodles = getImg("1585032226651-759b368d7246");
const img_rice = getImg("1512058564366-18510be2db19"); // Rice/grains
const img_fried_rice = getImg("1603133872878-684f208fb84b");
const img_thali = getImg("1589302168068-964664d93dc0");
const img_curry = getImg("1603894584202-933360aba39d");
const img_paneer = getImg("1611754764115-30fa00030588"); // High quality paneer
const img_dal = getImg("1546833999-b9f581a1996d");
const img_salad = getImg("1512621776951-a57141f2eefd");
const img_tea = getImg("1544787210-22bb64215754");
const img_coffee = getImg("1509042239860-f550ce710b93");
const img_shake = getImg("1553530666-ba11a7da3888");

export const combos = [
    // --- BREAKFAST ---
    { id: 1001, category: "Breakfast", name: "Aloo Paratha", description: "Spiced potato stuffed flatbread.", price: 60, originalPrice: 80, image: img_paratha },
    { id: 1002, category: "Breakfast", name: "Plain Paratha", description: "Classic whole wheat flaky paratha.", price: 50, originalPrice: 70, image: img_paratha },
    { id: 1003, category: "Breakfast", name: "Paneer Paratha", description: "Heritage paratha with cottage cheese.", price: 99, originalPrice: 130, image: img_paratha },
    { id: 1004, category: "Breakfast", name: "Poha", description: "Flattened rice with mustard and peanuts.", price: 90, originalPrice: 120, image: img_rice },
    { id: 1005, category: "Breakfast", name: "Veg Sandwich", description: "Fresh garden vegetable toast.", price: 100, originalPrice: 130, image: img_sandwich },
    { id: 1006, category: "Breakfast", name: "Butter Toast (4pc)", description: "Golden toasted bread with butter.", price: 50, originalPrice: 70, image: img_sandwich },
    { id: 1007, category: "Breakfast", name: "Plain Omelette", description: "Fluffy 2-egg classic omelette.", price: 50, originalPrice: 70, image: img_omelette },
    { id: 1008, category: "Breakfast", name: "Masala Omelette", description: "Spiced omelette with veggies.", price: 70, originalPrice: 90, image: img_omelette },
    { id: 1009, category: "Breakfast", name: "Bread Omelette", description: "Omelette wrapped in toasted bread.", price: 90, originalPrice: 110, image: img_omelette },

    // --- SNACKS ---
    { id: 2001, category: "Snacks", name: "Vegetable Noodle", description: "Wok-tossed noodles with veggies.", price: 120, originalPrice: 150, image: img_noodles },
    { id: 2002, category: "Snacks", name: "Veg Maggie", description: "The classic noodle comfort.", price: 80, originalPrice: 100, image: img_noodles },
    { id: 2003, category: "Snacks", name: "Veg Fried Rice", description: "Fragrant rice with garden vegetables.", price: 160, originalPrice: 200, image: img_fried_rice },
    { id: 2004, category: "Snacks", name: "Manchurian (Dry/Gravy)", description: "Crispy veg balls in spicy sauce.", price: 200, originalPrice: 250, image: img_noodles },
    { id: 2005, category: "Snacks", name: "Cheese Chilli", description: "Cottage cheese with capsicum.", price: 200, originalPrice: 260, image: img_paneer },
    { id: 2006, category: "Snacks", name: "Mix Pasta", description: "Penne pasta in choice of sauce.", price: 150, originalPrice: 190, image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?q=80&w=800" },
    { id: 2007, category: "Snacks", name: "Franch Fries", description: "Golden-crisp slated potato fries.", price: 150, originalPrice: 180, image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=800" },
    { id: 2008, category: "Snacks", name: "Mix Pakorda", description: "Assorted vegetable fritters.", price: 150, originalPrice: 190, image: img_noodles },
    { id: 2009, category: "Snacks", name: "Paneer Pakoda", description: "Batter-fried cottage cheese snacks.", price: 200, originalPrice: 240, image: img_paneer },

    // --- THALIS ---
    { id: 3001, category: "Thalis", name: "Special Thali", description: "4 Roti, Rice, Daal Tadka, Mix Veg, Raita, Salad.", price: 240, originalPrice: 300, image: img_thali },
    { id: 3002, category: "Thalis", name: "Deluxe Thali", description: "4 Butter Roti, Dal Makhni, Jeera Rice, Paneer Butter Masala, Raita, Salad.", price: 280, originalPrice: 350, image: img_thali },
    { id: 3003, category: "Thalis", name: "Non Veg Thali", description: "Chicken Curry, 4 Roti, Rice, Raita, Salad.", price: 350, originalPrice: 450, image: img_thali },

    // --- MAIN COURSE ---
    { id: 4001, category: "Main Course", name: "Paneer Butter Masala", description: "Rich creamy tomato gravy with paneer.", price: 250, originalPrice: 320, image: img_paneer },
    { id: 4002, category: "Main Course", name: "Dal Makhni", description: "Traditional slow-cooked black lentils.", price: 200, originalPrice: 250, image: img_dal },
    { id: 4003, category: "Main Course", name: "Chicken Curry", description: "Homestyle spicy chicken curry.", price: 300, originalPrice: 380, image: img_curry },
    { id: 4004, category: "Main Course", name: "Mix Vegetable", description: "Seasonal fresh vegetables medley.", price: 220, originalPrice: 280, image: img_salad },
    { id: 4005, category: "Main Course", name: "Mater Paneer", description: "Peas and cottage cheese in gravy.", price: 250, originalPrice: 310, image: img_paneer },
    { id: 4006, category: "Main Course", name: "Chicken Masala", description: "Bold and spicy semi-dry chicken.", price: 350, originalPrice: 420, image: img_curry },
    { id: 4007, category: "Main Course", name: "Aloo Gobhi", description: "Potatoes and cauliflower sautéed.", price: 160, originalPrice: 200, image: img_salad },
    { id: 4008, category: "Main Course", name: "Dal Tadka", description: "Yellow lentils tempered with ghee.", price: 180, originalPrice: 220, image: img_dal },

    // --- RAITA & SALAD ---
    { id: 5001, category: "Raita & Salad", name: "Boondi Raita", description: "Yogurt with crunchy boondi pearls.", price: 120, originalPrice: 150, image: img_salad },
    { id: 5002, category: "Raita & Salad", name: "Green Salad", description: "Fresh seasonal raw vegetables.", price: 130, originalPrice: 160, image: img_salad },
    { id: 5003, category: "Raita & Salad", name: "Kheera Salad", description: "Sliced fresh cucumber salad.", price: 120, originalPrice: 150, image: img_salad },
    { id: 5004, category: "Raita & Salad", name: "Plain Papad", description: "Crispy roasted or fried papadum.", price: 50, originalPrice: 70, image: "https://images.unsplash.com/photo-1626132646529-5fc33924391e?q=80&w=800" },

    // --- RICE ---
    { id: 6001, category: "Rice", name: "Plain Rice", description: "Steamed basmati fluffy rice.", price: 120, originalPrice: 150, image: img_rice },
    { id: 6002, category: "Rice", name: "Jeera Rice", description: "Rice tempered with cumin seeds.", price: 130, originalPrice: 160, image: img_rice },

    // --- BREADS ---
    { id: 7001, category: "Breads", name: "Tawa Roti", description: "Handmade whole wheat flatbread.", price: 25, originalPrice: 35, image: img_paratha },
    { id: 7002, category: "Breads", name: "Tawa Butter Roti", description: "Handmade roti with white butter.", price: 30, originalPrice: 40, image: img_paratha },

    // --- BEVERAGES ---
    { id: 8001, category: "Beverages", name: "Hot Tea", description: "Aromatic Masala tea with ginger.", price: 50, originalPrice: 70, image: img_tea },
    { id: 8002, category: "Beverages", name: "Hot Coffee", description: "Rich frothy roasted coffee.", price: 70, originalPrice: 100, image: img_coffee },
    { id: 8003, category: "Beverages", name: "Sweet Lassi", description: "Chilled sweetened thick yogurt.", price: 100, originalPrice: 130, image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=800" },
    { id: 8004, category: "Beverages", name: "Cold Coffee", description: "Chilled coffee blended with ice.", price: 150, originalPrice: 200, image: img_coffee },
    { id: 8005, category: "Beverages", name: "Mango Shake", description: "Seasonal premium mango thick shake.", price: 200, originalPrice: 250, image: img_shake }
];
