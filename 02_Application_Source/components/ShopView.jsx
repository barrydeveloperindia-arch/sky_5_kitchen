import { useState, useMemo, useEffect } from 'react';
import { combos } from '../data/combos';

function ShopView({ onNavigate }) {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const [activeCategory, setActiveCategory] = useState('All');

    const [searchTerm, setSearchTerm] = useState('');

    // Load cart from localStorage
    const [cart, setCart] = useState(() => {
        const savedCart = localStorage.getItem('sky5_cart');
        return savedCart ? JSON.parse(savedCart) : {};
    });

    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [showCart, setShowCart] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showMenuCard, setShowMenuCard] = useState(false);

    // Save cart
    useEffect(() => {
        localStorage.setItem('sky5_cart', JSON.stringify(cart));
    }, [cart]);

    // ... (rest of filtering logic)

    // Render Full Menu Card View
    if (showMenuCard) {
        return (
            <div className="mobile-app-container" style={{ background: '#fdfbf7' }}>
                <div className="cart-header" style={{ background: '#0a192f', color: '#d4af37' }}>
                    <h2 style={{ textTransform: 'uppercase', letterSpacing: '2px' }}>Luxury Menu Card</h2>
                    <button className="close-btn" style={{ color: '#d4af37' }} onClick={() => setShowMenuCard(false)}>✕</button>
                </div>
                
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h1 style={{ fontFamily: 'Playfair Display, serif', color: '#0a192f', fontSize: '2.5rem', margin: '10px 0' }}>HOTEL SKY-5</h1>
                    <div style={{ width: '50px', height: '2px', background: '#d4af37', margin: '0 auto 20px auto' }}></div>
                    
                    {/* Groups by category for the Card look */}
                    {['Breakfast', 'Main Course', 'Non-Veg', 'Thalis', 'Beverages'].map(cat => (
                        <div key={cat} style={{ marginBottom: '30px', textAlign: 'left' }}>
                            <h3 style={{ color: '#d4af37', borderBottom: '1px solid #eee', paddingBottom: '5px', textTransform: 'uppercase', fontSize: '1rem' }}>{cat}</h3>
                            {combos.filter(item => item.category === cat).map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                    <div>
                                        <div style={{ fontWeight: '700', color: '#0a192f' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#888' }}>{item.description.substring(0, 50)}...</div>
                                    </div>
                                    <div style={{ fontWeight: '800', color: '#0a192f' }}>₹{item.price}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                    
                    <button className="checkout-btn" onClick={() => { setShowMenuCard(false); showToast('Redirected to Order View', 'info'); }}>BACK TO QUICK ORDER</button>
                </div>
            </div>
        );
    }

    // Render Full Cart View (Same as before but wrapped in our container)

    // Modern Filters based on image "Filters", "Veg", "Non Veg", "Spicy", "Ratings"
    // Mapping these to our actual logic or just visual for now.
    // We keep our Categories but style them like chips.
    const categories = ['All', ...new Set(combos.map(c => c.category))];

    const filteredCombos = useMemo(() => {
        let result = combos;
        if (activeCategory !== 'All') {
            result = result.filter(c => c.category === activeCategory);
        }
        if (searchTerm) {
            result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return result;
    }, [activeCategory, searchTerm]);

    const addToCart = (id) => {
        setCart(prev => ({
            ...prev,
            [id]: (prev[id] || 0) + 1
        }));
        showToast('Item added to cart', 'success');
    };

    // Calculations
    const cartTotalItems = Object.values(cart).reduce((a, b) => a + b, 0);

    const { totalPrice, totalMrp } = Object.entries(cart).reduce((acc, [id, qty]) => {
        const item = combos.find(c => c.id === parseInt(id));
        if (item) {
            acc.totalPrice += item.price * qty;
            acc.totalMrp += item.originalPrice * qty;
        }
        return acc;
    }, { totalPrice: 0, totalMrp: 0 });

    const totalSavings = totalMrp - totalPrice;
    const gst = Math.round(totalPrice * 0.05);
    const grandTotal = totalPrice + gst;

    // Render Full Cart View (Same as before but wrapped in our container)
    if (showCart || showPayment) {
        return (
            <div className="mobile-app-container">
                {showCart ? (
                    <div className="cart-view" style={{ position: 'absolute' }}>
                        <div className="cart-header">
                            <h2>Your Cart</h2>
                            <button className="close-btn" onClick={() => setShowCart(false)}>✕</button>
                        </div>

                        <div className="cart-items">
                            {Object.keys(cart).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</div>
                                    <p>Your cart is empty.</p>
                                </div>
                            ) : (
                                Object.entries(cart).map(([id, qty]) => {
                                    const item = combos.find(c => c.id === parseInt(id));
                                    if (!item) return null;
                                    return (
                                        <div key={id} className="cart-item">
                                            <div className="cart-item-info">
                                                <div className="cart-item-name-row">
                                                    <span className="cart-item-name">{item.name}</span>
                                                </div>
                                                <div className="cart-item-price">
                                                    ₹{item.price}
                                                </div>
                                            </div>
                                            <div className="cart-item-actions">
                                                <div className="qty-control">
                                                    <button onClick={() => {
                                                        const newQty = qty - 1;
                                                        if (newQty === 0) {
                                                            const newCart = { ...cart };
                                                            delete newCart[id];
                                                            setCart(newCart);
                                                        } else {
                                                            setCart({ ...cart, [id]: newQty });
                                                        }
                                                    }}>-</button>
                                                    <span>{qty}</span>
                                                    <button onClick={() => setCart(prev => ({ ...prev, [id]: qty + 1 }))}>+</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="bill-details">
                            <div className="bill-row total">
                                <span>To Pay</span>
                                <span>₹{grandTotal}</span>
                            </div>
                        </div>

                        <button className="checkout-btn" onClick={() => setShowPayment(true)}>PROCEED TO PAY ₹{grandTotal}</button>
                    </div>
                ) : (
                    <div className="cart-view" style={{ position: 'absolute' }}>
                        <div className="cart-header">
                            <h2>Payment</h2>
                            <button className="close-btn" onClick={() => setShowPayment(false)}>✕</button>
                        </div>

                        <div className="payment-container">
                            <div className="payment-options">
                                {['UPI', 'Card', 'COD'].map((method) => (
                                    <div
                                        key={method}
                                        className={`pay-option ${paymentMethod === method ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod(method)}
                                    >
                                        <div className="pay-info">
                                            <div className="pay-title">{method}</div>
                                        </div>
                                        <div className="radio-circle"></div>
                                    </div>
                                ))}
                            </div>

                            <button className="checkout-btn" style={{ marginTop: '20px' }} onClick={() => {
                                showToast('Order Placed Successfully!', 'success');
                                setShowPayment(false);
                                setCart({});
                                setShowCart(false);
                            }}>
                                PLACE ORDER
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="mobile-app-container">
            {/* 1. Header Row */}
            <nav className="mobile-nav">
                <div className="app-title-nav">SKY 5 KITCHEN</div>
                <div className="nav-actions">
                    <div className="profile-circle">GA</div>
                </div>
            </nav>

            {/* 2. Hero Section (Premium Dark) */}
            <div className="modern-hero">
                <div className="hero-search-wrapper">
                    <div className="hero-search-pill">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder='Search "Paneer Butter Masala"...'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                border: 'none',
                                outline: 'none',
                                fontSize: '1rem',
                                color: '#333',
                                width: '100%',
                                background: 'transparent'
                            }}
                        />
                    </div>
                </div>

                <div className="hero-promo">
                    <div className="hero-promo-text">
                        <h1>Experience<br /><span>Luxury Dining</span><br />at Home</h1>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '15px' }}>
                            Curated flavors from Sky-5 Boutique Kitchen.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="shop-now-btn" onClick={() => {
                                const section = document.querySelector('.section-title-modern');
                                section?.scrollIntoView({ behavior: 'smooth' });
                            }}>ORDER NOW</button>
                            <button className="shop-now-btn" style={{ background: 'transparent', border: '1px solid var(--sky-accent)', color: 'var(--sky-accent)' }} onClick={() => setShowMenuCard(true)}>VIEW CARD</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Categories (Horizontal Scroll) */}
            <div className="section-title-modern">
                <span>Shop by Category</span>
            </div>
            <div className="modern-filters">
                <div className={`filter-chip ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>
                    <span className="filter-icon">🍽️</span>
                    <span className="filter-name">Explore All</span>
                </div>
                {categories.filter(c => c !== 'All').map(cat => (
                    <div
                        key={cat}
                        className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        <span className="filter-icon">
                            {cat === 'Breakfast' ? '🍳' :
                                cat === 'Snacks' ? '🍢' :
                                    cat === 'Chinese' ? '🥢' :
                                        cat === 'Rice' ? '🍚' :
                                            cat === 'Main Course' ? '🍛' :
                                                cat === 'Non-Veg' ? '🍗' :
                                                    cat === 'Thalis' ? '🍱' :
                                                        cat === 'Breads' ? '🫓' :
                                                            cat === 'Beverages' ? '☕' : '🍽️'}
                        </span>
                        <span className="filter-name">{cat}</span>
                    </div>
                ))}
            </div>

            {/* 4. Menu Grid (Featured Store) */}
            <div className="section-title-modern">
                <span>Featured Items</span>
                <span className="see-all">See all ({filteredCombos.length})</span>
            </div>

            <div className="modern-menu-list">
                {filteredCombos.map(item => (
                    <div key={item.id} className="modern-item-card">
                        {item.isBestSeller && (
                            <div className="badge-float">BESTSELLER</div>
                        )}

                        <div className="item-img-wrapper">
                            <img src={item.image} className="item-img-modern" alt={item.name} loading="lazy" />
                        </div>

                        <div className="item-content-modern">
                            <div className="item-title-modern">{item.name}</div>
                            {/* Mock weight or desc */}
                            <div className="item-weight">1 Plate</div>

                            <div className="price-row-modern">
                                <div className="item-price">₹{item.price}</div>
                                <div className="add-btn-square" onClick={() => addToCart(item.id)}>+</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 5. Bottom Tabs */}
            <div className="bottom-tabs">
                <div className="nav-tab active">
                    <span className="nav-icon">🏠</span>
                    <span>Home</span>
                </div>
                <div className="nav-tab">
                    <span className="nav-icon">🔍</span>
                    <span>Search</span>
                </div>
                <div className="nav-tab" onClick={() => setShowCart(true)}>
                    <span className="nav-icon" style={{ position: 'relative' }}>
                        🛍️
                        {cartTotalItems > 0 && <span style={{
                            position: 'absolute', top: -5, right: -8, background: '#ef4f5f',
                            color: 'white', fontSize: '0.6rem', borderRadius: '50%',
                            width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>{cartTotalItems}</span>}
                    </span>
                    <span>Bag</span>
                </div>
                <div className="nav-tab" onClick={() => setShowMenuCard(true)}>
                    <span className="nav-icon">📖</span>
                    <span>Menu</span>
                </div>
                <div className="nav-tab" onClick={() => onNavigate('dashboard')}>
                    <span className="nav-icon">👤</span>
                    <span>Account</span>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div className={`toast-notification ${toast.type === 'success' ? 'toast-success' : ''}`}>
                    <span>{toast.type === 'success' ? '✅' : 'ℹ️'}</span>
                    {toast.message}
                </div>
            )}

            {/* Floating Cart Bar (Above Tabs) if items exist */}
            {cartTotalItems > 0 && (
                <div className="cart-floating-bar" onClick={() => setShowCart(true)}>
                    <div className="cart-info">
                        <span>{cartTotalItems} Items</span> • ₹{totalPrice}
                    </div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>View Cart &gt;</div>
                </div>
            )}

        </div>
    );
}

export default ShopView;
