/**
 * HOTEL SKY 5 - 5-STAR ROOM INVENTORY
 * Triple-Verified Luxury Hospitality Assets
 */

export const rooms = [
    {
        id: 101,
        type: "Deluxe Executive Room",
        price: 2499,
        status: "Clean", // Clean, Dirty, Occupied
        amenities: ["AC", "Free WiFi", "Smart TV", "Mini Bar", "City View"],
        image: "/images/hotel_room_king_teal.png",
        description: "A premium 5-star experience with bespoke wood furnishings and panoramic skyline views."
    },
    {
        id: 102,
        type: "Luxury Suite",
        price: 3999,
        status: "Occupied",
        amenities: ["AC", "King Bed", "Bathtub", "Balcony", "Breakfast Included"],
        image: "/images/hotel_suite_luxury.png",
        description: "Unmatched elegance featuring a separate living area and designer interiors."
    },
    {
        id: 201,
        type: "Royal Penthouse",
        price: 7499,
        status: "Dirty",
        amenities: ["Central AC", "Private Terrace", "Jacuzzi", "Butler Service"],
        image: "/images/hotel_penthouse_royal.png",
        description: "The pinnacle of luxury. Perfect for families and VIP stays."
    },
    {
        id: 202,
        type: "Superior Twin Room",
        price: 1999,
        status: "Clean",
        amenities: ["AC", "Twin Beds", "Work Desk", "24/7 Service"],
        image: "/images/hotel_room_king_teal.png", // Reusing since I don't have twin room image yet
        description: "Modern comfort designed for business travelers and shared stays."
    },
    {
        id: 301,
        type: "Signature Studio",
        price: 2999,
        status: "Clean",
        amenities: ["AC", "Kitchenette", "Garden View", "Premium Linen"],
        image: "/images/hotel_suite_luxury.png", // Reusing studio style
        description: "A chic, spacious studio blending modern tech with cozy ambiance."
    }
];
