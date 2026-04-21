const getImg = (id) => `https://images.unsplash.com/photo-${id}?q=80&w=1200&auto=format&fit=crop`;

export const ambiance = [
    {
        id: "amb-001",
        title: "Signature Reception",
        description: "Welcome to Hotel Sky 5. Our dedicated staff is here to serve you 24/7.",
        image: getImg("1566073771259-6a8506099945")
    },
    {
        id: "amb-002",
        title: "Sky Rooftop Garden",
        description: "Experience the serenity of our lush green rooftop garden. Perfect for relaxation.",
        image: getImg("1582719478250-c89cae4dc85b")
    },
    {
        id: "amb-003",
        title: "Divine Temple Area",
        description: "A peaceful shrine for spiritual moments during your stay.",
        image: getImg("1544644181-1484b3fdfc62")
    },
    {
        id: "amb-004",
        title: "Luxury Corridors",
        description: "Immaculate pathways leading to your private sanctuary.",
        image: getImg("1549294413-26f195200c16")
    },
    {
        id: "amb-005",
        title: "Elevator Landing",
        description: "Modern accessibility across all floors of Disha Arcade.",
        image: getImg("1517840901100-8179e982ad91")
    }
];
