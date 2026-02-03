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

    // Save cart
    useEffect(() => {
        localStorage.setItem('sky5_cart', JSON.stringify(cart));
    }, [cart]);

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

            {/* 2. Hero Section (Green Curve) */}
            <div className="modern-hero">
                <div className="hero-search-wrapper">
                    <div className="hero-search-pill">
                        <span>🔍</span>
                        <input
                            type="text"
                            placeholder='Search "Paneer Tikka..."'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.9rem',
                                color: '#333',
                                width: '100%',
                                background: 'transparent'
                            }}
                        />
                    </div>
                </div>

                <div className="hero-promo">
                    <div className="hero-promo-text">
                        <h1>We bring<br />the flavor<br />to your door</h1>
                        <button className="shop-now-btn">ORDER NOW</button>
                    </div>
                    {/* Circular Image on Right */}
                    <img src="/images/sky5_logo_hotel.png" className="hero-promo-img" alt="Hero" />
                </div>
            </div>

            {/* 3. Categories (Horizontal Scroll) */}
            <div className="section-title-modern">
                <span>Shop by Category</span>
            </div>
            <div className="modern-filters">
                <div className={`filter-chip ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>
                    <span className="filter-icon">🍽️</span>
                    <span className="filter-name">All Items</span>
                </div>
                {categories.filter(c => c !== 'All').map(cat => (
                    <div
                        key={cat}
                        className={`filter-chip ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        <span className="filter-icon">
                            {cat === 'Combos' ? '🍱' :
                                cat === 'Starters' ? '🍢' :
                                    cat === 'Soups' ? '🥣' :
                                        cat === 'Breads' ? '🍞' :
                                            cat === 'Desserts' ? '🍰' : '🍛'}
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
