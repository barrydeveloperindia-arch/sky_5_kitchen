import { useState, useMemo } from 'react';
import { rooms as initialRooms } from '../data/rooms';
import Logo from './Logo';

function AdminDashboard({ onNavigate }) {
    const [rooms, setRooms] = useState(initialRooms);
    const [activeTab, setActiveTab] = useState('Reception'); // Reception, Kitchen, Cleaning, Finance
    const [orders] = useState([
        { id: 'ORD-8241', items: '2x Aloo Paratha, 1x Tea', status: 'Pending', time: '12:45 PM' },
        { id: 'ORD-9102', items: '1x Special Thali', status: 'Preparing', time: '1:10 PM' }
    ]);

    const stats = useMemo(() => {
        const occupied = rooms.filter(r => r.status === 'Occupied').length;
        const dirty = rooms.filter(r => r.status === 'Dirty').length;
        const clean = rooms.filter(r => r.status === 'Clean').length;
        return { occupied, dirty, clean };
    }, [rooms]);

    const updateRoomStatus = (id, newStatus) => {
        setRooms(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
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
                    {['Reception', 'Kitchen', 'Cleaning', 'Finance'].map(tab => (
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                        {rooms.map(room => (
                            <div key={room.id} style={{ background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', position: 'relative' }}>
                                <div style={{ 
                                    position: 'absolute', top: '20px', right: '20px', 
                                    background: room.status === 'Clean' ? '#27ae60' : room.status === 'Occupied' ? '#3498db' : '#e74c3c',
                                    color: 'white', padding: '5px 12px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 'bold'
                                }}>{room.status.toUpperCase()}</div>
                                
                                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--primary-navy)' }}>Room {room.id}</h3>
                                <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '20px' }}>{room.type}</div>
                                
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {room.status === 'Clean' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem' }} onClick={() => updateRoomStatus(room.id, 'Occupied')}>CHECK-IN</button>}
                                    {room.status === 'Occupied' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: '#34495e' }} onClick={() => updateRoomStatus(room.id, 'Dirty')}>CHECK-OUT</button>}
                                    {room.status === 'Dirty' && <button className="checkout-btn" style={{ padding: '8px', fontSize: '0.8rem', background: 'var(--accent)', color: 'black' }} onClick={() => updateRoomStatus(room.id, 'Clean')}>MARK CLEANED</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tab: Kitchen (Orders) */}
                {activeTab === 'Kitchen' && (
                    <div style={{ background: 'white', borderRadius: '25px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                    <th style={{ padding: '20px' }}>Order ID</th>
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
                                        <td>{order.items}</td>
                                        <td>{order.time}</td>
                                        <td><span style={{ padding: '5px 10px', borderRadius: '8px', background: '#f1c40f', fontSize: '0.7rem', fontWeight: 'bold' }}>{order.status}</span></td>
                                        <td><button className="shop-now-btn" style={{ padding: '5px 15px' }}>PREPARE</button></td>
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

            </main>
        </div>
    );
}

export default AdminDashboard;
