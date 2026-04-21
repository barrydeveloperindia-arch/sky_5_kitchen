const getImg = (id) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`;

export const rooms = [
    {
        id: 9001,
        name: "Standard King Room",
        description: "Elegant king-size bed with modern study area and premium wood finishing.",
        price: 1824,
        originalPrice: 2200,
        image: getImg("1611892440504-42a792e24d32"),
        features: ["King Bed", "AC", "Study Desk", "Modern Bathroom"]
    },
    {
        id: 9002,
        name: "Luxury Deluxe Suite",
        description: "Spacious suite with the best views of Panchkula, premium linens.",
        price: 2500,
        originalPrice: 3500,
        image: getImg("1590490360182-c33d57733427"),
        features: ["City View", "Lounge Area", "Free Wi-Fi", "Mini Bar"]
    }
];
