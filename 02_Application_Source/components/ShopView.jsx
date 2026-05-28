import { useState, useMemo, useEffect } from 'react';
import { combos } from '../data/combos';
import { rooms } from '../data/rooms';
import { ambiance } from '../data/ambiance';
import Logo from './Logo';

function ShopView({ onNavigate, onPlaceOrder, menuItems }) {
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
    const [tableNumber, setTableNumber] = useState('');
    const [showCart, setShowCart] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showMenuCard, setShowMenuCard] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(null);
    const [showInvoice, setShowInvoice] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);

    // Auto-detect table number from URL (e.g. ?table=5)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tableParam = params.get('table');
        if (tableParam) {
            setTableNumber('Table ' + tableParam);
        }
    }, []);

    // Save cart
    useEffect(() => {
        localStorage.setItem('sky5_cart', JSON.stringify(cart));
    }, [cart]);

    // ... (rest of filtering logic)

    // Render Full Cart View (Same as before but wrapped in our container)

    // Modern Filters based on image "Filters", "Veg", "Non Veg", "Spicy", "Ratings"
    // Mapping these to our actual logic or just visual for now.
    // We keep our Categories but style them like chips.
    // Pure Veg Category List
    const categories = ['All', 'Stays', 'Ambiance', ...new Set(menuItems.map(c => c.category))].filter(c => c !== 'Non-Veg');

    const filteredCombos = useMemo(() => {
        let result = menuItems;
        if (activeCategory !== 'All') {
            result = result.filter(c => c.category === activeCategory);
        }
        if (searchTerm) {
            result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return result;
    }, [activeCategory, searchTerm, menuItems]);

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
        const item = menuItems.find(c => c.id === parseInt(id)) || rooms.find(r => r.id === parseInt(id));
        if (item) {
            acc.totalPrice += item.price * qty;
            acc.totalMrp += (item.originalPrice || item.price) * qty;
        }
        return acc;
    }, { totalPrice: 0, totalMrp: 0 });

    const totalSavings = totalMrp - totalPrice;
    const gst = Math.round(totalPrice * 0.05);
    const grandTotal = totalPrice + gst;

    const processCheckout = () => {
        if (cartTotalItems === 0) {
            showToast('Bag is empty!', 'error');
            return;
        }
        if (!tableNumber.trim()) {
            showToast('Please enter Table/Room Number', 'error');
            return;
        }
        
        const orderItemsList = Object.keys(cart).map(id => {
            const item = menuItems.find(c => c.id === parseInt(id)) || rooms.find(r => r.id === parseInt(id));
            return { ...item, quantity: cart[id] };
        });

        const orderData = {
            id: `SKY5-${Math.floor(1000 + Math.random() * 9000)}`,
            table: tableNumber,
            date: new Date().toLocaleString(),
            items: orderItemsList,
            subtotal: totalPrice,
            gst: gst,
            total: grandTotal
        };
        
        setCurrentOrder(orderData);
        setShowInvoice(true);
        setShowCart(false);
        setShowPayment(false);
        setCart({}); // Clear cart after checkout

        // Push order to global admin state
        if (onPlaceOrder) {
            const formattedItemsText = orderItemsList.map(i => `${i.quantity}x ${i.name}`).join(', ');
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            onPlaceOrder({
                id: orderData.id,
                table: tableNumber,
                items: formattedItemsText,
                status: 'Pending',
                time: timeStr,
                details: orderItemsList
            }, grandTotal);
        }
    };

    const shareOnWhatsApp = () => {
        if (!currentOrder) return;
        
        const message = `🏨 *Hotel Sky 5 - OFFICIAL INVOICE* 🏨\n----------------------------------------\n🧾 *Order ID:* #${currentOrder.id}\n📅 *Date:* ${currentOrder.date}\n🚪 *Room / Table:* ${currentOrder.table}\n\n🍽️ *ORDER DETAILS:*\n${currentOrder.items.map(i => `▪️ ${i.quantity}x ${i.name}`).join('\n')}\n\n💰 *Subtotal:* ₹${currentOrder.subtotal}\n🏛️ *GST (5%):* ₹${currentOrder.gst}\n----------------------------------------\n✅ *GRAND TOTAL: ₹${currentOrder.total}*\n----------------------------------------\n🙏 Thank you for dining with Hotel Sky 5!`;
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    };

    // Render Professional A4 Invoice
    if (showInvoice && currentOrder) {
        return (
            <div className="mobile-app-container" style={{ background: '#f8f9fa', maxWidth: '100%', padding: '40px' }}>
                <div style={{ 
                    background: 'white', 
                    maxWidth: '800px', 
                    margin: '0 auto', 
                    padding: '60px', 
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    border: '1px solid #eee',
                    fontFamily: 'Inter, sans-serif',
                    position: 'relative',
                    overflow: 'hidden'
                }} id="invoice-sheet">
                    {/* Watermark Logo */}
                    <div style={{
                        position: 'absolute',
                        top: '55%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        opacity: 0.04,
                        pointerEvents: 'none',
                        zIndex: 0
                    }}>
                        <Logo size={450} noBorder={true} />
                    </div>
                    
                    {/* Invoice Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#0a192f', color: 'white', padding: '40px', margin: '-60px -60px 40px -60px', borderBottom: '4px solid #d4af37', position: 'relative', zIndex: 1 }}>
                        <div>
                            <Logo size={100} noBorder={true} />
                            <h1 style={{ color: 'white', margin: '15px 0 5px 0', fontSize: '2rem' }}>Hotel Sky 5</h1>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Sector 4, Panchkula, Haryana 134112</p>
                            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>📞 +91 081464 07934</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ color: '#d4af37', fontSize: '2.5rem', margin: '0' }}>INVOICE</h2>
                            <p style={{ fontWeight: '800', margin: '10px 0 5px 0', color: 'white' }}># {currentOrder.id}</p>
                            <p style={{ color: '#aaa' }}>{currentOrder.date}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
                        <thead>
                            <tr style={{ background: '#0a192f', color: 'white' }}>
                                <th style={{ textAlign: 'left', padding: '15px' }}>Item Details</th>
                                <th style={{ textAlign: 'center', padding: '15px' }}>Price</th>
                                <th style={{ textAlign: 'center', padding: '15px' }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '15px' }}>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentOrder.items.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: '700' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#888' }}>{item.category}</div>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '15px' }}>₹{item.price}</td>
                                    <td style={{ textAlign: 'center', padding: '15px' }}>{item.quantity}</td>
                                    <td style={{ textAlign: 'right', padding: '15px' }}>₹{item.price * item.quantity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Summary */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                                <span>Subtotal</span>
                                <span>₹{currentOrder.subtotal}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #ddd' }}>
                                <span>GST (5%)</span>
                                <span>₹{currentOrder.gst}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', fontWeight: '900', fontSize: '1.4rem', color: '#0a192f' }}>
                                <span>GRAND TOTAL</span>
                                <span>₹{currentOrder.total}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ marginTop: '100px', textAlign: 'center', borderTop: '2px dashed #eee', paddingTop: '40px' }}>
                        <h3 style={{ color: '#d4af37' }}>Thank You for Visiting! 🙏</h3>
                        <p style={{ color: '#999' }}>Hope to see you again soon at Hotel Sky 5.</p>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ maxWidth: '800px', margin: '40px auto', display: 'flex', gap: '20px' }}>
                    <button className="checkout-btn" style={{ flex: 1 }} onClick={() => window.print()}>🖨️ PRINT / SAVE AS PDF</button>
                    <button className="checkout-btn" style={{ flex: 1, background: '#25D366' }} onClick={shareOnWhatsApp}>💬 SHARE VIA WHATSAPP</button>
                    <button className="checkout-btn" style={{ flex: 1, background: '#666' }} onClick={() => setShowInvoice(false)}>BACK TO HOME</button>
                </div>
            </div>
        );
    }
    
    if (showMenuCard) {
        return (
            <div className="menu-print-container" style={{ background: '#f5f5f5', maxWidth: '100%', height: 'auto', minHeight: '100vh', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                
                {/* PAGE 1 */}
                <div className="menu-card-design" style={{ 
                    background: '#ffffff', 
                    width: '100%',
                    maxWidth: '1000px', 
                    position: 'relative',
                    padding: '8px', /* Outer blue border gap */
                    border: '3px solid #0a192f', /* Thick dark blue outer border */
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    height: 'max-content'
                }}>
                    <div style={{
                        border: '2px solid #d4af37', /* Inner gold border */
                        padding: '30px',
                        minHeight: '270mm'
                    }}>
                        
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0a192f', paddingBottom: '20px', marginBottom: '20px' }}>
                            {/* Left: Brand Name */}
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '2.4rem', margin: '0', lineHeight: '1.1', fontWeight: '900', letterSpacing: '1px' }}>
                                    HOTEL<br/>SKY 5
                                </h1>
                                <p style={{ margin: '5px 0 0 0', color: '#0a192f', fontWeight: '800', letterSpacing: '4px', fontSize: '0.8rem' }}>RESTAURANT</p>
                            </div>

                            {/* Center: Menu Label */}
                            <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '5px' }}>
                                    <Logo size={40} noBorder={true} />
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '-40px', right: '-40px', top: '50%', height: '2px', background: '#0a192f', zIndex: 0 }}></div>
                                        <h2 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', margin: 0, fontSize: '2.5rem', background: '#fff', padding: '0 15px', position: 'relative', zIndex: 1, letterSpacing: '4px' }}>MENU</h2>
                                    </div>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', letterSpacing: '3px', color: '#333' }}>PAGE 1 OF 2 • GOOD FOOD. GREAT STAY.</p>
                            </div>

                            {/* Right: Contact & Icons */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <div style={{ border: '2px solid #0a192f', borderRadius: '20px', padding: '5px 20px', fontWeight: '900', color: '#0a192f', fontSize: '1rem', marginBottom: '15px' }}>
                                    ORDER NO. DIAL 9
                                </div>
                                <div style={{ display: 'flex', gap: '20px', fontSize: '0.7rem', fontWeight: '800', color: '#0a192f', textAlign: 'center' }}>
                                    <div><div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🛎️</div>FRONT DESK</div>
                                    <div><div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>📶</div>FREE WI-FI</div>
                                    <div><div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>⚡</div>24H POWER</div>
                                </div>
                            </div>
                        </div>

                        {/* Menu Columns Grid (Page 1) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            {/* Left Column */}
                            <div>
                                {/* Breakfast */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>BREAKFAST</h3>
                                        <span style={{ background: '#fff3cd', color: '#856404', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>8 AM - 10 AM</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Breakfast').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.name}
                                                    {item.isPopular && <span style={{ border: '1px solid #f39c12', color: '#f39c12', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px' }}>CHEF'S PICK</span>}
                                                </span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Snacks */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>SNACKS</h3>
                                        <span style={{ background: '#fff3cd', color: '#856404', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>ALL DAY</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Snacks').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.description.includes('🔴') ? <span style={{ color: '#d32f2f', fontSize: '0.8rem', marginRight: '5px' }}>🔴</span> : <span style={{ color: '#24963f', fontSize: '0.8rem', marginRight: '5px' }}>🟢</span>}
                                                    {item.name}
                                                    {item.isPopular && <span style={{ border: '1px solid #28a745', color: '#28a745', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '2px' }}>BEST SELLER</span>}
                                                </span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                {/* Chinese Items */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>CHINESE ITEMS</h3>
                                        <span style={{ background: '#fff3cd', color: '#856404', padding: '2px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '800' }}>12 PM - 10 PM</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Chinese').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Rice Items */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>RICE ITEMS</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Rice').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sweet Dish */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>SWEET DISH</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Sweet Dish').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* PAGE 2 */}
                <div className="menu-card-design" style={{ 
                    background: '#ffffff', 
                    width: '100%',
                    maxWidth: '1000px', 
                    position: 'relative',
                    padding: '8px', 
                    border: '3px solid #0a192f', 
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    height: 'max-content'
                }}>
                    <div style={{
                        border: '2px solid #d4af37', 
                        padding: '30px',
                        minHeight: '270mm'
                    }}>
                        
                        {/* Header Row Page 2 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0a192f', paddingBottom: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '2.4rem', margin: '0', lineHeight: '1.1', fontWeight: '900', letterSpacing: '1px' }}>
                                    HOTEL<br/>SKY 5
                                </h1>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <h2 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', margin: 0, fontSize: '2rem', letterSpacing: '4px' }}>MENU</h2>
                                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', letterSpacing: '3px', color: '#333' }}>PAGE 2 OF 2 • EXQUISITE DINING</p>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', fontSize: '0.85rem', fontWeight: '800', color: '#0a192f' }}>
                                DIAL 9 FOR ROOM SERVICE
                            </div>
                        </div>

                        {/* Menu Columns Grid (Page 2) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            {/* Left Column */}
                            <div>
                                {/* Vegetarian Main Dishes */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>VEGETARIAN MAIN DISHES</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Main Course' && i.description.includes('🟢')).map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ color: '#24963f', fontSize: '0.8rem', marginRight: '5px' }}>🟢</span>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Non-Vegetarian Main Dishes */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>NON-VEGETARIAN MAIN DISHES</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Main Course' && i.description.includes('🔴')).map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ color: '#d32f2f', fontSize: '0.8rem', marginRight: '5px' }}>🔴</span>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Breads */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>BREADS</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Breads').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                {/* Thalis */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>THALIS</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {menuItems.filter(i => i.category === 'Thalis').map(item => (
                                            <div key={item.id} style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#0a192f', fontSize: '1rem', textTransform: 'uppercase' }}>
                                                    <span>{item.description.includes('🔴') ? <span style={{ color: '#d32f2f', marginRight: '5px' }}>🔴</span> : <span style={{ color: '#24963f', marginRight: '5px' }}>🟢</span>}{item.name}</span>
                                                    <span>₹{item.price}</span>
                                                </div>
                                                <p style={{ margin: '5px 0 0 0', fontSize: '0.75rem', color: '#555', lineHeight: '1.4' }}>
                                                    {item.description.replace('🟢 ', '').replace('🔴 ', '')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Salad */}
                                <div style={{ marginBottom: '25px' }}>
                                    <div style={{ borderBottom: '2px solid #0a192f', paddingBottom: '4px', marginBottom: '15px' }}>
                                        <h3 style={{ fontFamily: 'Georgia, serif', color: '#0a192f', fontSize: '1.3rem', margin: 0, fontWeight: '900' }}>SALAD</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {menuItems.filter(i => i.category === 'Salad').map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontWeight: '800', color: '#0a192f', fontSize: '0.85rem', textTransform: 'uppercase' }}>{item.name}</span>
                                                <div style={{ flex: 1, borderBottom: '2px dotted #ccc', margin: '0 10px', position: 'relative', top: '-4px' }}></div>
                                                <span style={{ fontWeight: '900', color: '#0a192f', fontSize: '0.95rem' }}>₹{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Amenities & QR Box */}
                                <div style={{ border: '2px solid #0a192f', borderRadius: '8px', padding: '15px', marginTop: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', fontWeight: '800', color: '#0a192f', marginBottom: '15px' }}>
                                        <div>🛎️ 24H FRONT DESK</div>
                                        <div>🛗 LIFT FACILITY</div>
                                        <div>🚗 FREE PARKING</div>
                                        <div>🌳 ROOFTOP GARDEN</div>
                                        <div>❄️ AC ROOMS</div>
                                        <div>⭐ LUXURY STAY</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent('https://maps.app.goo.gl/vYD2Yq42HKpCsr2J9')}`} alt="QR" style={{ width: '50px', height: '50px' }} />
                                        <div style={{ fontWeight: '900', fontSize: '0.75rem', color: '#0a192f', lineHeight: '1.2' }}>SCAN TO LEAVE A 5-STAR REVIEW ⭐⭐⭐⭐⭐</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '3px solid #0a192f', paddingTop: '15px', marginTop: '20px' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#555', lineHeight: '1.4' }}>
                                • OUTSIDE FOOD NOT ALLOWED • ROOM SERVICE: 8:00 AM TO 10:30 PM
                            </div>
                            <div style={{ background: '#c89d3a', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontWeight: '900', fontSize: '0.8rem' }}>
                                +5% GST APPLICABLE
                            </div>
                        </div>

                    </div>
                </div>

                {/* Glassy Bottom Action Bar */}
                <div style={{ 
                    position: 'fixed', 
                    bottom: '0', 
                    left: '0', 
                    right: '0', 
                    background: 'rgba(255, 255, 255, 0.8)', 
                    backdropFilter: 'blur(10px)',
                    padding: '15px 20px',
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '15px',
                    zIndex: 1000
                }}>
                    <button style={{ 
                        background: '#25D366', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px 25px', 
                        borderRadius: '30px', 
                        fontWeight: 'bold', 
                        fontSize: '0.9rem',
                        boxShadow: '0 5px 15px rgba(37, 211, 102, 0.3)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap'
                    }} onClick={() => {
                        window.print();
                        const msg = encodeURIComponent("Check out the official Menu Card of Hotel Sky 5!");
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                    }}>
                        <span>💬</span> SHARE ON WHATSAPP
                    </button>

                    <button style={{ 
                        background: '#0a192f', 
                        color: 'white', 
                        border: '2px solid #d4af37', 
                        padding: '12px 25px', 
                        borderRadius: '30px', 
                        fontWeight: 'bold', 
                        fontSize: '0.9rem',
                        boxShadow: '0 5px 15px rgba(10, 25, 47, 0.3)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }} onClick={() => setShowMenuCard(false)}>
                        CLOSE MENU
                    </button>
                </div>
            </div>
        );
    }




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
                                    const item = menuItems.find(c => c.id === parseInt(id)) || rooms.find(r => r.id === parseInt(id));
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

                        <button className="checkout-btn" onClick={() => { setShowCart(false); setShowPayment(true); }}>PROCEED TO PAY ₹{grandTotal}</button>
                    </div>
                ) : (
                    <div className="cart-view" style={{ position: 'absolute' }}>
                        <div className="cart-header">
                            <h2>Payment</h2>
                            <button className="close-btn" onClick={() => setShowPayment(false)}>✕</button>
                        </div>

                        <div className="payment-container">
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#0a192f' }}>Table / Room Number <span style={{color: 'red'}}>*</span></label>
                                <input 
                                    type="text" 
                                    value={tableNumber} 
                                    onChange={(e) => setTableNumber(e.target.value)}
                                    placeholder="e.g. Table 4 or Room 102"
                                    style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' }}
                                />
                            </div>
                            
                            <div className="payment-options">
                                {['UPI', 'Card', 'Room Charge', 'COD'].map((method) => (
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

                            <button className="checkout-btn" onClick={processCheckout}>
                                {paymentMethod === 'Room Charge' ? 'CONFIRM ROOM CHARGE' : 'PLACE ORDER'}
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
                <div className="app-title-nav" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Logo size={40} />
                    <span style={{ fontSize: '1.4rem', fontWeight: '800', letterSpacing: '1px' }}>Hotel Sky 5</span>
                </div>
                
                {/* Desktop Menu Tabs */}
                <div className="desktop-menu" style={{ display: 'flex', gap: '30px', margin: '0 40px' }}>
                   {['Home', 'Menu Card', 'Admin'].map(tab => (
                       <span 
                        key={tab} 
                        style={{ 
                            cursor: 'pointer', 
                            fontWeight: '600', 
                            color: tab === 'Home' ? 'var(--primary)' : '#888',
                            fontSize: '0.9rem'
                        }}
                        onClick={() => {
                            if (tab === 'Menu Card') setShowMenuCard(true);
                            if (tab === 'Admin') onNavigate('dashboard');
                        }}
                       >{tab}</span>
                   ))}
                </div>

                <div className="nav-actions">
                    <div className="rating-badge" style={{ background: '#d4af37', color: '#0a192f', padding: '5px 15px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ⭐ 3.8/5
                    </div>
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
                        <h1 style={{ fontFamily: 'Cinzel, serif', letterSpacing: '4px' }}>Smart Stay.<br /><span>True Comfort.</span><br />Hotel Sky 5</h1>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '15px', fontStyle: 'italic' }}>
                            Your premium 5-star signature property in the heart of Panchkula.
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
                            {cat === 'Stays' ? '🏨' :
                                cat === 'Breakfast' ? '🍳' :
                                cat === 'Snacks' ? '🍢' :
                                    cat === 'Chinese' ? '🥢' :
                                        cat === 'Rice' ? '🍚' :
                                            cat === 'Main Course' ? '🍛' :
                                                cat === 'Non-Veg' ? '🍗' :
                                                    cat === 'Thalis' ? '🍱' :
                                                        cat === 'Breads' ? '🫓' :
                                            cat === 'Salad' ? '🥗' : 
                                            cat === 'Sweet Dish' ? '🍨' : '🍽️'}
                        </span>
                        <span className="filter-name">{cat}</span>
                    </div>
                ))}
            </div>

            {/* 4. Menu Grid (Featured Store) */}
            <div className="section-title-modern">
                <span>Featured Items</span>
                <span className="see-all">See all ({
                    activeCategory === 'Stays' ? rooms.length : 
                    activeCategory === 'Ambiance' ? ambiance.length : 
                    filteredCombos.length
                })</span>
            </div>

            <div className="modern-menu-list">
                {activeCategory === 'Stays' ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ background: 'white', padding: '30px', borderRadius: '30px', marginBottom: '40px', display: 'flex', gap: '20px', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                             <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Check-in & Out</label>
                                <input type="date" className="hero-search-pill" style={{ width: '100%', marginTop: '5px', padding: '12px' }} defaultValue={new Date().toISOString().split('T')[0]} />
                             </div>
                             <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#999', textTransform: 'uppercase' }}>Guests</label>
                                <select className="hero-search-pill" style={{ width: '100%', marginTop: '5px', padding: '12px' }}>
                                    <option>1 Guest</option>
                                    <option selected>2 Guests</option>
                                    <option>3 Guests</option>
                                    <option>4+ Guests</option>
                                </select>
                             </div>
                             <button className="shop-now-btn" style={{ height: '50px', alignSelf: 'flex-end' }}>Update Search</button>
                        </div>
                        <div className="modern-menu-list">
                            {rooms.map(room => (
                                <div key={room.id} className="luxury-room-card" style={{ height: 'auto' }}>
                                    <div style={{ height: '240px', overflow: 'hidden', position: 'relative' }}>
                                        <img src={room.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={room.type} />
                                        <div style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.9)', padding: '5px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '800' }}>⭐ 4.9</div>
                                    </div>
                                    <div style={{ padding: '25px' }}>
                                        <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: 'var(--primary-navy)' }}>{room.type}</h3>
                                        <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '15px' }}>{room.description}</p>
                                        <div style={{ marginBottom: '20px' }}>
                                            {room.amenities.map(a => <span key={a} className="amenity-chip">{a}</span>)}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>₹{room.price} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#999' }}>/ night</span></div>
                                            <button className="add-btn-square" style={{ width: 'auto', padding: '0 25px' }} onClick={() => {
                                                addToCart(room.id);
                                                showToast(`${room.type} added to reservation.`, 'success');
                                            }}>BOOK NOW</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeCategory === 'Ambiance' ? (
                    ambiance.map(item => (
                        <div key={item.id} className="modern-item-card room-card">
                            <div className="badge-float" style={{ background: '#d4af37', color: '#0a192f' }}>PROPERTY</div>
                            <div className="item-img-wrapper">
                                <img src={item.image} className="item-img-modern" alt={item.title} />
                            </div>
                            <div className="item-content-modern">
                                <div className="item-title-modern">{item.title}</div>
                                <div className="item-weight">{item.description}</div>
                                <div className="price-row-modern">
                                    <div className="item-price" style={{ fontSize: '0.8rem', opacity: 0.8 }}>Exclusively for Guests</div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    filteredCombos.map(item => (
                    <div key={item.id} className="modern-item-card">
                        {item.isPopular && (
                            <div className="badge-float" style={{ background: 'var(--accent)', color: 'var(--primary)' }}>TOP PICK</div>
                        )}

                        <div className="item-img-wrapper">
                            <img src={item.image} className="item-img-modern" alt={item.name} loading="lazy" />
                        </div>

                        <div className="item-content-modern">
                            <div className="item-title-modern">
                                <span style={{ 
                                    color: item.description.includes('🔴') ? '#d32f2f' : '#24963f', 
                                    fontSize: '0.8rem', 
                                    marginRight: '5px' 
                                }}>
                                    {item.description.includes('🔴') ? '🔴' : '🟢'}
                                </span>
                                {item.name}
                            </div>
                            <div className="item-weight">{item.description.replace('🟢 ', '').replace('🔴 ', '')}</div>

                            <div className="price-row-modern">
                                <div className="item-price">₹{item.price}</div>
                                <div className="add-btn-square" onClick={() => addToCart(item.id)}>+</div>
                            </div>
                        </div>
                    </div>
                ))
            )}
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
                    <span>Admin</span>
                </div>
            </div>

            {/* Business Info Footer */}
            <footer className="app-business-footer" style={{ 
                padding: '40px 20px 100px 20px', 
                background: '#f8f9fa', 
                textAlign: 'center', 
                fontSize: '0.8rem', 
                color: '#666',
                borderTop: '1px solid #eee',
                marginTop: '30px'
            }}>
                <div style={{ fontWeight: 'bold', color: '#0a192f', marginBottom: '10px', fontSize: '1rem' }}>Hotel Sky 5</div>
                <p style={{ margin: '5px 0' }}>5th Floor, Disha Arcade Building, IT Park Rd, Mansa Devi Complex, Sector 4, Panchkula, Haryana 134114</p>
                <p style={{ margin: '5px 0' }}>
                    <a href="https://maps.app.goo.gl/vYD2Yq42HKpCsr2J9" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-accent)', textDecoration: 'none' }}>
                        📍 View on Google Maps
                    </a>
                </p>
                <p style={{ margin: '5px 0' }}>📞 081464 07934 • 🌐 hotelsky5.com</p>

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '20px', 
                    marginTop: '15px', 
                    paddingTop: '15px', 
                    borderTop: '1px dashed #ccc' 
                }}>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Check-in</div>
                        <div>12:00 PM</div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Check-out</div>
                        <div>11:00 AM</div>
                    </div>
                </div>
            </footer>

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
