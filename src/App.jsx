import { useState, useMemo, useEffect } from 'react';
import { combos } from './data/combos';

function App() {
  const [toast, setToast] = useState(null); // { message, type }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  const [activeCategory, setActiveCategory] = useState('All');
  // Load cart from localStorage or default to empty
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('sky5_cart');
    return savedCart ? JSON.parse(savedCart) : {};
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sky5_cart', JSON.stringify(cart));
  }, [cart]);

  const categories = ['All', ...new Set(combos.map(c => c.category))];

  const filteredCombos = useMemo(() => {
    if (activeCategory === 'All') return combos;
    return combos.filter(c => c.category === activeCategory);
  }, [activeCategory]);

  const addToCart = (id) => {
    setCart(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
    showToast('Item added to cart', 'success');
  };

  /* Calculated Values */
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

  const gst = Math.round(totalPrice * 0.05); // 5% GST
  const grandTotal = totalPrice + gst;

  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  /* Dashboard Data (Mock) */
  const dashboardData = {
    stats: [
      { label: "Total Sales", value: "₹24,599", change: "+12%" },
      { label: "Active Orders", value: "8", change: "Now" },
      { label: "New Customers", value: "45", change: "Today" }
    ],
    recentOrders: [
      { id: "#ORD-001", customer: "Rahul Sharma", items: "Dal Tadka Combo (x2)", amount: "₹1,598", status: "Cooking" },
      { id: "#ORD-002", customer: "Priya Singh", items: "Paneer Butter Masala Combo", amount: "₹849", status: "Delivered" },
      { id: "#ORD-003", customer: "Amit Kumar", items: "Rajma Chawal Combo", amount: "₹649", status: "Pending" },
      { id: "#ORD-004", customer: "Sneha Gupta", items: "Chilli Paneer Combo", amount: "₹899", status: "Cooking" },
      { id: "#ORD-005", customer: "Vikram Malhotra", items: "Combo #1 + Dessert", amount: "₹1,098", status: "Delivered" }
    ]
  };

  const [checklist, setChecklist] = useState([
    // Daily Control
    { id: 1, task: 'Accepting Orders Promptly', type: 'Ops', checked: false },
    { id: 2, task: 'Morning Breakfast Prep (7-10 AM)', type: 'Shift', checked: true },

    // Packaging SOPs
    { id: 3, task: 'Soup: Sealed Container + Outer Cover', type: 'Packaging', checked: false },
    { id: 4, task: 'Rice/Noodles: Rectangular Box', type: 'Packaging', checked: false },
    { id: 5, task: 'Biryani: Wide Cont. + Raita Separate', type: 'Packaging', checked: false },
    { id: 6, task: 'Soup Lids Taped Securely', type: 'Packaging', checked: false },

    // Profit & Quality Control
    { id: 7, task: 'Portion Spoon Fixed (Cost Control)', type: 'Profit', checked: false },
    { id: 8, task: 'Oil Usage Controlled', type: 'Profit', checked: false },
    { id: 9, task: 'Every Order Checked Before Seal', type: 'Quality', checked: false },
    { id: 10, task: 'Raita Always with Biryani', type: 'Quality', checked: false },

    // Provisions / Inventory
    { id: 11, task: 'Check Flour', type: 'Provisions', checked: false },
    { id: 12, task: 'Check Salt', type: 'Provisions', checked: false },
    { id: 13, task: 'Check Pepper', type: 'Provisions', checked: false },
    { id: 14, task: 'Check Cheese', type: 'Provisions', checked: false },
  ]);

  const toggleChecklist = (id) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const [view, setView] = useState('shop'); // shop, dashboard

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="brand" onClick={() => setView('shop')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <img src="/images/logo.png" alt="Sky 5 Kitchen" style={{ height: '45px', marginRight: '10px' }} />
          <span>Sky 5 Kitchen</span>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="location-pill" title="5th floor, Disha Arcade Building, IT Park Rd, Mansa Devi Complex, Sector 4, MDC Sector 4, Panchkula, Haryana 134114">
            <span>📍</span> 5th Floor, Disha Arcade, MDC Sec 4
          </div>
          <button
            onClick={() => setView(view === 'shop' ? 'dashboard' : 'shop')}
            style={{
              background: '#333', color: '#fff', border: 'none',
              padding: '5px 10px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer'
            }}
          >
            {view === 'shop' ? 'Admin' : 'Shop'}
          </button>
        </div>
      </header>

      {view === 'dashboard' ? (
        <div className="dashboard-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>Owner Dashboard</h2>

          {/* Stats Grid */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            {dashboardData.stats.map((stat, i) => (
              <div key={i} style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '5px' }}>{stat.label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#333' }}>{stat.value}</div>
                <div style={{ color: '#24963f', fontSize: '0.8rem', fontWeight: '600', marginTop: '5px' }}>{stat.change}</div>
              </div>
            ))}
          </div>


          {/* Sales Graph */}
          <div className="dashboard-section" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Sales Overview (Weekly)</h3>
            <div style={{ height: '250px', width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 10px' }}>
              {[
                { day: 'Mon', val: 40 },
                { day: 'Tue', val: 65 },
                { day: 'Wed', val: 55 },
                { day: 'Thu', val: 80 },
                { day: 'Fri', val: 95 },
                { day: 'Sat', val: 100 },
                { day: 'Sun', val: 85 }
              ].map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                  <div className="bar-tooltip" style={{ marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>₹{d.val}k</div>
                  <div style={{
                    height: `${d.val * 2}px`,
                    width: '40px',
                    background: 'linear-gradient(to top, #ef4f5f, #ff7e5f)',
                    borderRadius: '8px 8px 0 0',
                    transition: 'height 0.5s ease',
                    maxWidth: '100%'
                  }}></div>
                  <div style={{ marginTop: '10px', color: '#888', fontSize: '0.9rem' }}>{d.day}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SOP Checklist */}
          <div className="dashboard-section" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Daily Kitchen Operations (SOP)</h3>
              <span style={{ background: '#e0f7fa', color: '#006064', padding: '5px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600' }}>
                {checklist.filter(i => i.checked).length}/{checklist.length} Completed
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
              {checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px',
                    background: item.checked ? '#f0fff4' : '#f9f9f9',
                    borderRadius: '8px', border: item.checked ? '1px solid #48bb78' : '1px solid #eee',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    border: item.checked ? 'none' : '2px solid #ccc',
                    background: item.checked ? '#48bb78' : 'transparent',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: '12px', flexShrink: 0
                  }}>
                    {item.checked && '✓'}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', color: item.checked ? '#2f855a' : '#333', textDecoration: item.checked ? 'line-through' : 'none' }}>
                      {item.task}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.type}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders Section */}
          <div className="dashboard-section" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Recent Orders</h3>
            <div className="orders-table" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0', color: '#888', fontSize: '0.9rem' }}>
                    <th style={{ padding: '10px' }}>Order ID</th>
                    <th style={{ padding: '10px' }}>Customer</th>
                    <th style={{ padding: '10px' }}>Items</th>
                    <th style={{ padding: '10px' }}>Amount</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.recentOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={{ padding: '15px 10px', fontWeight: '600' }}>{order.id}</td>
                      <td style={{ padding: '15px 10px' }}>{order.customer}</td>
                      <td style={{ padding: '15px 10px', color: '#555' }}>{order.items}</td>
                      <td style={{ padding: '15px 10px', fontWeight: '700' }}>{order.amount}</td>
                      <td style={{ padding: '15px 10px' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                          background: order.status === 'Delivered' ? '#eaffef' : order.status === 'Cooking' ? '#fff6e0' : '#f0f0f0',
                          color: order.status === 'Delivered' ? '#24963f' : order.status === 'Cooking' ? '#ff9800' : '#888'
                        }}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Business Targets & Goals (From Notes) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div className="dashboard-section" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '0' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#ef4f5f' }}>🚀 First 60-90 Days Goals</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {[
                  { text: 'Get Orders (30-40 Soup Orders)', done: false },
                  { text: 'Get Ratings 4★+', done: true },
                  { text: 'Build Repeat Customers', done: false },
                  { text: 'Push Prices Up (After Base Built)', done: false }
                ].map((goal, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: '0.95rem' }}>
                    <span style={{
                      marginRight: '10px',
                      color: goal.done ? '#24963f' : '#ccc',
                      fontSize: '1.2rem'
                    }}>{goal.done ? '☑' : '☐'}</span>
                    <span style={{ textDecoration: goal.done ? 'line-through' : 'none', color: goal.done ? '#888' : '#333' }}>{goal.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="dashboard-section" style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '0' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', color: '#24963f' }}>💰 Profit & Brand Strategy</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #24963f' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>Target Margin</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#333' }}>30-35% Gross Margin</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>(After Commissions)</div>
                </div>
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ef4f5f' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '5px' }}>Brand Positioning</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#333' }}>Boutique Hotel Kitchen</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>Premium Packaging & Quality</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : showCart ? (
        <div className="cart-view">
          <div className="cart-header">
            <h2>Your Cart</h2>
            <button className="close-btn" onClick={() => setShowCart(false)}>✕</button>
          </div>

          <div className="cart-items">
            {Object.keys(cart).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🛒</div>
                <p>Your cart is empty. Add some delicious combos!</p>
              </div>
            ) : (
              Object.entries(cart).map(([id, qty]) => {
                const item = combos.find(c => c.id === parseInt(id));
                if (!item) return null;
                return (
                  <div key={id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name-row">
                        {item.isBestSeller && <span className="tiny-tag">BESTSELLER</span>}
                        <span className="cart-item-name">{item.name}</span>
                      </div>
                      <div className="cart-item-price">
                        <span className="original">₹{item.originalPrice}</span> ₹{item.price}
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
                            if (Object.keys(newCart).length === 0) {
                              // Keep cart open to show empty state or close? 
                              // User might want to see it removed. 
                              // Let's keep it open so they see the empty message.
                              // Removing setShowCart(false) logic here if we want that.
                              // But sticking to previous logic:
                            }
                          } else {
                            setCart({ ...cart, [id]: newQty });
                          }
                        }}>-</button>
                        <span>{qty}</span>
                        <button onClick={() => setCart(prev => ({ ...prev, [id]: qty + 1 }))}>+</button>
                      </div>
                      <div className="item-final-price">₹{item.price * qty}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bill-details">
            <h3>Bill Details</h3>
            <div className="bill-row">
              <span>Item Total</span>
              <span>₹{totalPrice}</span>
            </div>
            <div className="bill-row savings">
              <span>Savings on Menu Price</span>
              <span>-₹{totalSavings}</span>
            </div>
            <div className="bill-row">
              <span>GST (5%)</span>
              <span>₹{gst}</span>
            </div>
            <div className="bill-divider"></div>
            <div className="bill-row total">
              <span>To Pay</span>
              <span>₹{grandTotal}</span>
            </div>
          </div>

          <button className="checkout-btn" onClick={() => setShowPayment(true)}>PROCEED TO PAY ₹{grandTotal}</button>
        </div>
      ) : showPayment ? (
        <div className="cart-view">
          <div className="cart-header">
            <h2>Payment Options</h2>
            <button className="close-btn" onClick={() => setShowPayment(false)}>✕</button>
          </div>

          <div className="payment-container">
            <div className="payment-total-header">
              <span>Amount to Pay</span>
              <span className="amount">₹{grandTotal}</span>
            </div>

            <div className="payment-options">
              <div className="pay-option">
                <div className="pay-icon">📱</div>
                <div className="pay-info">
                  <div className="pay-title">UPI</div>
                  <div className="pay-sub">Google Pay, PhonePe, Paytm</div>
                </div>
                <div className="radio-circle"></div>
              </div>

              <div className="pay-option">
                <div className="pay-icon">💳</div>
                <div className="pay-info">
                  <div className="pay-title">Credit / Debit Cards</div>
                  <div className="pay-sub">Visa, Mastercard, RuPay</div>
                </div>
                <div className="radio-circle"></div>
              </div>

              <div className="pay-option">
                <div className="pay-icon">💵</div>
                <div className="pay-info">
                  <div className="pay-title">Cash on Delivery</div>
                  <div className="pay-sub">Pay cash at your doorstep</div>
                </div>
                <div className="radio-circle"></div>
              </div>
            </div>

            <button className="checkout-btn" style={{ marginTop: '20px' }} onClick={() => {
              showToast('Order Placed Successfully! Kitchen is preparing your food.', 'success');
              setShowPayment(false);
              setCart({});
              setView('shop');
            }}>
              PLACE ORDER
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Premium Hero Section */}
          <section className="hero-premium">
            <div className="hero-content">
              <h1>Experience the Taste of <br /> <span className="highlight">Cloud 9</span></h1>
              <p>Premium Combos delivered properly packed & hot.</p>
              <div className="hero-tags">
                <span>✨ 4.8/5 Rating</span>
                <span>⏱️ 35 Mins Delivery</span>
              </div>
            </div>
          </section>

          {/* Safety & Trust Strip */}
          <div className="safety-strip">
            <div className="safety-item">
              <span className="icon">🛡️</span>
              <span className="text">100% Hygienic</span>
            </div>
            <div className="safety-item">
              <span className="icon">🌡️</span>
              <span className="text">Daily Temp Checks</span>
            </div>
            <div className="safety-item">
              <span className="icon">🥬</span>
              <span className="text">Fresh Ingredients</span>
            </div>
            <div className="safety-item">
              <span className="icon">🥣</span>
              <span className="text">No MSG</span>
            </div>
          </div>

          {/* Filters */}
          <div className="filters-container">
            {categories.map(cat => (
              <div
                key={cat}
                className={`filter-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </div>
            ))}
          </div>

          {/* Menu Grid */}
          <main className="menu-grid">
            {filteredCombos.map(combo => (
              <div key={combo.id} className="combo-card">
                <div className="card-image-container">
                  {combo.isBestSeller && <div className="bestseller-badge">Best Seller</div>}
                  <img src={combo.image} alt={combo.name} className="card-image" loading="lazy" />
                </div>
                <div className="card-content">
                  <div className="card-header">
                    <div className="card-title">{combo.name}</div>
                    <div className="veg-icon">
                      <div className="veg-dot"></div>
                    </div>
                  </div>
                  <div className="card-desc">
                    {combo.description}
                  </div>
                  <div className="price-row">
                    <div className="price-block">
                      <span className="sale-price">₹{combo.price}</span>
                      <span className="mrp-price">₹{combo.originalPrice}</span>
                    </div>
                    <button
                      className="add-btn"
                      onClick={() => addToCart(combo.id)}
                    >
                      ADD {cart[combo.id] ? `(${cart[combo.id]})` : ''}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </main>

          {/* Floating Cart */}
          {cartTotalItems > 0 && (
            <div className="floating-cart">
              <div className="cart-bar" onClick={() => setShowCart(true)}>
                <div className="cart-details">
                  <span className="cart-count">{cartTotalItems} ITEMS</span>
                  <span className="cart-total">₹{totalPrice} plus taxes</span>
                </div>
                <div className="view-cart-text">
                  View Cart <span>→</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'success' ? 'toast-success' : ''}`}>
          <span>{toast.type === 'success' ? '✅' : 'ℹ️'}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
