import { useState, useMemo } from 'react';
import { rooms as initialRooms } from '../data/rooms';
import Logo from './Logo';

function AdminDashboard({ onNavigate, orders, setOrders, menuItems, setMenuItems, rooms, setRooms }) {
    const [activeTab, setActiveTab] = useState('Reception'); // Reception, Kitchen, Cleaning, Finance
    const [editingRoom, setEditingRoom] = useState(null);
    const [guestForm, setGuestForm] = useState({ name: '', phone: '', address: '', advance: '', advanceType: 'Cash', foodBill: '', checkInTime: '', checkOutTime: '' });

    const stats = useMemo(() => {
        const occupied = rooms.filter(r => r.status === 'Occupied').length;
        const dirty = rooms.filter(r => r.status === 'Dirty').length;
        const clean = rooms.filter(r => r.status === 'Clean').length;
        return { occupied, dirty, clean };
    }, [rooms]);

    const updateRoomStatus = (id, newStatus) => {
        setRooms(prev => prev.map(r => {
            if (r.id === id) {
                // If checking out, we optionally could clear the guest data, but keeping it for history is fine.
                // However, for clean state, we should probably clear it when marking clean.
                if (newStatus === 'Clean') {
                    const { guest, ...rest } = r;
                    return { ...rest, status: newStatus };
                }
                return { ...r, status: newStatus };
            }
            return r;
        }));
    };

    const handleCheckInClick = (room) => {
        const now = new Date();
        const defaultCheckIn = now.toISOString().slice(0, 16);
        setGuestForm(room.guest ? { 
            name: room.guest.name, 
            phone: room.guest.phone, 
            address: room.guest.address || '', 
            advance: room.guest.advance || '', 
            advanceType: room.guest.advanceType || 'Cash', 
            foodBill: room.foodBill || '',
            checkInTime: room.guest.checkIn || defaultCheckIn,
            checkOutTime: room.guest.checkOut || ''
        } : { 
            name: '', 
            phone: '', 
            address: '', 
            advance: '', 
            advanceType: 'Cash', 
            foodBill: room.foodBill || '',
            checkInTime: defaultCheckIn,
            checkOutTime: ''
        });
        setEditingRoom(room);
    };

    const handleSaveGuest = () => {
        if (!guestForm.name.trim()) {
            alert("Guest name is required.");
            return;
        }
        
        const now = new Date();
        const checkInTime = editingRoom.guest?.checkIn || now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ", " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        setRooms(prev => prev.map(r => r.id === editingRoom.id ? { 
            ...r, 
            status: 'Occupied',
            foodBill: Number(guestForm.foodBill) || 0,
            guest: { 
                name: guestForm.name, 
                phone: guestForm.phone, 
                address: guestForm.address, 
                checkIn: guestForm.checkInTime || checkInTime, 
                checkOut: guestForm.checkOutTime,
                advance: Number(guestForm.advance) || 0, 
                advanceType: guestForm.advanceType 
            }
        } : r));
        
        setEditingRoom(null);
    };

    return (
        <div className="mobile-app-container" style={{ maxWidth: '100%', background: '#f0f2f5', minHeight: '100vh', display: 'flex' }}>
            
            {/* Sidebar Navigation */}
            <aside style={{ width: '280px', background: 'var(--primary-navy)', color: 'white', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div onClick={() => onNavigate('shop')} style={{ cursor: 'pointer' }}>
                    <Logo size={80} />
                    <h2 style={{ fontFamily: 'Cinzel', color: 'var(--accent)', marginTop: '15px', textAlign: 'center' }}>OPS CENTER</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['Reception', 'Kitchen', 'Cleaning', 'Finance', 'Menu Config'].map(tab => (
                        <div 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '15px 25px',
                                borderRadius: '12px',
                                background: activeTab === tab ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                                color: activeTab === tab ? 'var(--accent)' : '#8892b0',
                                cursor: 'pointer',
                                fontWeight: '700',
                                transition: 'all 0.3s'
                            }}
                        >
                            {tab === 'Reception' && '🏨 '}
                            {tab === 'Kitchen' && '🍳 '}
                            {tab === 'Cleaning' && '🧹 '}
                            {tab === 'Finance' && '📊 '}
                            {tab === 'Menu Config' && '⚙️ '}
                            {tab}
                        </div>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>LOGGED IN AS</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>System Admin</div>
                </div>
            </aside>

            {/* Main Operational Area */}
            <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-navy)' }}>{activeTab} Dashboard</h1>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div className="stat-pill">Occupied: <b>{stats.occupied}</b></div>
                        <div className="stat-pill" style={{ color: '#e74c3c' }}>Dirty: <b>{stats.dirty}</b></div>
                        <div className="stat-pill" style={{ color: '#27ae60' }}>Available: <b>{stats.clean}</b></div>
                    </div>
                </header>

                {/* Tab: Reception (Room Grid) */}
                {activeTab === 'Reception' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        {['Super Deluxe Room', 'Deluxe Room', 'Standard Room'].map(roomType => {
                            const categoryRooms = rooms.filter(r => r.type === roomType);
                            if (categoryRooms.length === 0) return null;
                            return (
                                <div key={roomType}>
                                    <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy)', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
                                        {roomType}s
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                                        {categoryRooms.map(room => (
                                            <div key={room.id} style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
                                                <div style={{ 
                                                    position: 'absolute', top: '20px', right: '20px', 
                                                    background: room.status === 'Clean' ? '#27ae60' : room.status === 'Occupied' ? '#3498db' : '#e74c3c',
                                                    color: 'white', padding: '5px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold'
                                                }}>{room.status.toUpperCase()}</div>
                                                
                                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: 'var(--primary-navy)' }}>Room {room.id}</h3>
                                                <div style={{ color: '#27ae60', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 'bold' }}>{room.description}</div>
                                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '15px' }}>Features: {room.amenities.join(', ')}</div>
                                                
                                                {room.status === 'Occupied' && room.guest ? (
                                                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #3498db', fontSize: '0.8rem' }}>
                                                        <div style={{ fontWeight: '800', color: '#0a192f', marginBottom: '5px' }}>👤 {room.guest.name}</div>
                                                        <div style={{ color: '#555', marginBottom: '3px' }}>📞 {room.guest.phone}</div>
                                                        {room.guest.address && <div style={{ color: '#555', marginBottom: '3px' }}>📍 {room.guest.address}</div>}
                                                        <div style={{ color: '#888', fontSize: '0.7rem', marginBottom: '10px' }}>🕒 In: {room.guest.checkIn}</div>
                                                        <div style={{ borderTop: '1px dashed #ccc', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Room Rate:</span> <b>₹{room.price}</b></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Food Bill:</span> <b>₹{room.foodBill || 0}</b></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#27ae60' }}><span>Advance {room.guest.advanceType ? `(${room.guest.advanceType})` : ''}:</span> <b>- ₹{room.guest.advance || 0}</b></div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #ddd', fontWeight: 'bold', fontSize: '0.9rem', color: ((room.price + (room.foodBill || 0)) - (room.guest.advance || 0)) > 0 ? '#e74c3c' : '#27ae60' }}>
                                                                <span>Balance:</span> <span>₹{(room.price + (room.foodBill || 0)) - (room.guest.advance || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '70px', marginBottom: '20px' }}></div>
                                                )}
                                                
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    {room.status === 'Clean' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem' }} onClick={() => handleCheckInClick(room)}>CHECK-IN</button>}
                                                    {room.status === 'Occupied' && (
                                                        <>
                                                            <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: '#e67e22' }} onClick={() => handleCheckInClick(room)}>EDIT GUEST</button>
                                                            <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: '#34495e' }} onClick={() => updateRoomStatus(room.id, 'Dirty')}>CHECK-OUT</button>
                                                        </>
                                                    )}
                                                    {room.status === 'Dirty' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: 'var(--accent)', color: 'black' }} onClick={() => updateRoomStatus(room.id, 'Clean')}>MARK CLEANED</button>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tab: Kitchen (Orders) */}
                {activeTab === 'Kitchen' && (
                    <div style={{ background: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '20px' }}>Order ID</th>
                                    <th>Table/Room</th>
                                    <th>Items</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '20px', fontWeight: 'bold' }}>{order.id}</td>
                                        <td style={{ fontWeight: 'bold', color: '#e74c3c' }}>{order.table || 'N/A'}</td>
                                        <td>{order.items}</td>
                                        <td>{order.time}</td>
                                        <td><span style={{ padding: '5px 10px', borderRadius: '8px', background: order.status === 'Completed' ? '#2ecc71' : order.status === 'Preparing' ? '#3498db' : '#f1c40f', color: order.status === 'Completed' || order.status === 'Preparing' ? 'white' : 'black', fontSize: '0.7rem', fontWeight: 'bold' }}>{order.status}</span></td>
                                        <td>
                                            {order.status === 'Pending' && <button className="shop-now-btn" style={{ padding: '5px 15px' }} onClick={() => setOrders(prev => prev.map(o => o.id === order.id ? {...o, status: 'Preparing'} : o))}>PREPARE</button>}
                                            {order.status === 'Preparing' && <button className="shop-now-btn" style={{ padding: '5px 15px', background: '#3498db', color: 'white', border: 'none' }} onClick={() => setOrders(prev => prev.map(o => o.id === order.id ? {...o, status: 'Completed'} : o))}>SERVE</button>}
                                            {order.status === 'Completed' && <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>✓ DELIVERED</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'Cleaning' && (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#999' }}>
                        <div style={{ fontSize: '4rem' }}>🧹</div>
                        <h2>Housekeeping Roster Active</h2>
                        <p>Total {stats.dirty} rooms pending for turnover.</p>
                    </div>
                )}

                {activeTab === 'Finance' && (
                    <div style={{ textAlign: 'center', padding: '100px', color: '#999' }}>
                        <div style={{ fontSize: '4rem' }}>💰</div>
                        <h2>Daily Collection Report</h2>
                        <p>Revenue Stream: <b>₹14,580</b> (Today)</p>
                    </div>
                )}

                {activeTab === 'Menu Config' && (
                    <div style={{ background: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <h2 style={{ marginBottom: '20px', color: 'var(--primary-navy)' }}>Menu Configuration</h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '20px' }}>Item ID</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Price (₹)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {menuItems?.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                        <td style={{ padding: '20px', color: '#666' }}>{item.id}</td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--primary-navy)' }}>{item.name}</td>
                                        <td>{item.category}</td>
                                        <td>
                                            <input 
                                                type="number" 
                                                value={item.price} 
                                                onChange={(e) => setMenuItems(prev => prev.map(m => m.id === item.id ? {...m, price: Number(e.target.value)} : m))}
                                                style={{ padding: '8px', width: '80px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' }}
                                            />
                                        </td>
                                        <td>
                                            <button 
                                                onClick={() => setMenuItems(prev => prev.map(m => m.id === item.id ? {...m, isActive: !m.isActive} : m))}
                                                style={{ 
                                                    padding: '8px 15px', 
                                                    borderRadius: '8px', 
                                                    border: 'none', 
                                                    background: item.isActive ? '#2ecc71' : '#e74c3c', 
                                                    color: 'white', 
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {item.isActive ? 'ACTIVE' : 'HIDDEN'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </main>

            {/* Check-In / Edit Modal */}
            {editingRoom && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0, 33, 71, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '450px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        {/* Modal Header */}
                        <div style={{ background: 'var(--primary-navy)', padding: '25px 30px', borderBottom: '3px solid var(--accent)' }}>
                            <h2 style={{ margin: '0', color: 'white', fontFamily: 'Cinzel, serif', fontSize: '1.6rem', letterSpacing: '1px' }}>
                                {editingRoom.status === 'Occupied' ? 'GUEST DOSSIER' : 'GUEST REGISTRATION'}
                            </h2>
                            <div style={{ color: 'var(--accent)', fontSize: '0.9rem', marginTop: '5px', letterSpacing: '1px' }}>
                                ROOM {editingRoom.id} • {editingRoom.type.toUpperCase()}
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Full Name <span style={{color: '#e74c3c'}}>*</span></label>
                                <input 
                                    type="text" 
                                    value={guestForm.name} 
                                    onChange={(e) => setGuestForm({...guestForm, name: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                    placeholder="Enter guest's full name"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contact Number</label>
                                <input 
                                    type="text" 
                                    value={guestForm.phone} 
                                    onChange={(e) => setGuestForm({...guestForm, phone: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                    placeholder="Enter mobile number"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Address Details</label>
                                <textarea 
                                    value={guestForm.address} 
                                    onChange={(e) => setGuestForm({...guestForm, address: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s', minHeight: '80px', fontFamily: 'inherit' }}
                                    placeholder="Enter full address, ID info, or city"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-In Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={guestForm.checkInTime} 
                                        onChange={(e) => setGuestForm({...guestForm, checkInTime: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-Out Time</label>
                                    <input 
                                        type="datetime-local" 
                                        value={guestForm.checkOutTime} 
                                        onChange={(e) => setGuestForm({...guestForm, checkOutTime: e.target.value})}
                                        style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Advance Payment (₹)</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input 
                                        type="number" 
                                        value={guestForm.advance} 
                                        onChange={(e) => setGuestForm({...guestForm, advance: e.target.value})}
                                        style={{ flex: 2, padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                        placeholder="0"
                                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                        onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                    />
                                    <select
                                        value={guestForm.advanceType}
                                        onChange={(e) => setGuestForm({...guestForm, advanceType: e.target.value})}
                                        style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="Card">Card</option>
                                        <option value="GPay">GPay</option>
                                        <option value="PhonePe">PhonePe</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: 'var(--primary-navy)', textTransform: 'uppercase', letterSpacing: '1px' }}>Food Bill (₹)</label>
                                <input 
                                    type="number" 
                                    value={guestForm.foodBill} 
                                    onChange={(e) => setGuestForm({...guestForm, foodBill: e.target.value})}
                                    style={{ width: '100%', padding: '15px', borderRadius: '12px', border: '1px solid #e0e0e0', background: '#f8f9fa', fontSize: '1rem', color: '#333', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                                    placeholder="0"
                                    onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                                />
                            </div>
                            
                            {/* Modal Footer */}
                            <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                                <button style={{ flex: 1, padding: '15px', background: 'white', border: '2px solid #e0e0e0', borderRadius: '12px', color: '#555', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '0.9rem', letterSpacing: '1px' }} onClick={() => setEditingRoom(null)} onMouseOver={(e) => e.target.style.background='#f0f0f0'} onMouseOut={(e) => e.target.style.background='white'}>CANCEL</button>
                                <button style={{ flex: 1, padding: '15px', background: 'var(--primary-navy)', border: 'none', borderRadius: '12px', color: 'var(--accent)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', fontSize: '0.9rem', letterSpacing: '1px', boxShadow: '0 4px 15px rgba(0,33,71,0.2)' }} onClick={handleSaveGuest} onMouseOver={(e) => e.target.style.transform='translateY(-2px)'} onMouseOut={(e) => e.target.style.transform='translateY(0)'}>AUTHORIZE</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
