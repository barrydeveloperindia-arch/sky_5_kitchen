import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Logo from './Logo';

function AdminDashboard({ onNavigate }) {
    const [activeTab, setActiveTab] = useState('dashboard');

    // Mock Data
    const stats = [
        { label: "Total Revenue", value: "₹1.34L", direction: "up", percent: "12%" },
        { label: "Active Orders", value: "45", direction: "up", percent: "5%" },
        { label: "Avg Ticket", value: "₹450", direction: "down", percent: "2%" },
    ];

    const recentOrders = [
        { id: "ORD-001", customer: "Rahul Sharma", item: "Dal Tadka Combo", price: "- ₹799", status: "Cooking", time: "10:30 AM", type: "Food" },
        { id: "ORD-002", customer: "Priya Singh", item: "Paneer Butter Masala", price: "- ₹849", status: "Delivered", time: "10:45 AM", type: "Food" },
        { id: "ORD-003", customer: "Amit Kumar", item: "Rajma Chawal", price: "- ₹649", status: "Pending", time: "11:00 AM", type: "Food" },
        { id: "ORD-004", customer: "Zomato Rider", item: "Payout", price: "+ ₹2,400", status: "Completed", time: "12:00 PM", type: "Payout" },
    ];

    const staff = [
        { name: "Rajesh Kumar", role: "Head Chef", status: "On Duty", img: "👨‍🍳" },
        { name: "Sunil Singh", role: "Sous Chef", status: "On Duty", img: "👨‍🍳" },
        { name: "Priya Sharma", role: "Manager", status: "On Duty", img: "👩‍💼" },
        { name: "Arjun Rampal", role: "Delivery", status: "Absent", img: "🚵" },
    ];

    const checklist = [
        { id: 1, task: 'Morning Kitchen Prep', done: true },
        { id: 2, task: 'Room 501-510 Inspection', done: false },
        { id: 3, task: 'Daily Revenue Audit', done: false },
        { id: 4, task: 'Inventory Sync', done: true },
    ];

    return (
        <div className="admin-container">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="admin-content">
                {/* Header */}
                <header className="admin-header">
                    <div className="header-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                            <Logo size={50} color="#0a192f" />
                            <h1 style={{ margin: 0 }}>Hotel Sky 5 Command Center 🏢</h1>
                        </div>
                        <p>Managing luxury hospitality and fine dining operations.</p>

                    </div>
                    <div className="header-right">
                        <div className="search-bar">
                            <span>🔍</span>
                            <input type="text" placeholder="Search orders..." />
                        </div>
                        <div className="profile-pill" onClick={() => onNavigate('shop')}>
                            <span className="shop-link">Go to Shop ↗</span>
                            <div className="avatar">👨‍💻</div>
                        </div>
                    </div>
                </header>

                <div className="dashboard-layout">
                    {/* Left Column (Main) */}
                    <div className="main-column">

                        {/* Stats Row */}
                        <div className="stats-row">
                            {stats.map((stat, i) => (
                                <div key={i} className="stat-card glass-panel">
                                    <div className="stat-icon">{i === 0 ? '💰' : i === 1 ? '🛍️' : '📈'}</div>
                                    <div className="stat-info">
                                        <span className="stat-label">{stat.label}</span>
                                        <h3 className="stat-value">{stat.value}</h3>
                                    </div>
                                    <span className={`stat-change ${stat.direction}`}>
                                        {stat.direction === 'up' ? '▲' : '▼'} {stat.percent}
                                    </span>
                                </div>
                            ))}
                            {/* Graph Card */}
                            <div className="graph-card glass-panel">
                                <div className="graph-header">
                                    <span>Weekly Sales</span>
                                    <span className="graph-badge">Success</span>
                                </div>
                                <div className="mini-graph">
                                    {/* CSS Bar Graph */}
                                    {[40, 65, 55, 80, 95, 100, 85].map((h, idx) => (
                                        <div key={idx} className="bar" style={{ height: `${h * 0.5}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Transactions / Orders */}
                        <div className="section-header">
                            <h2>All Transactions</h2>
                            <div className="filter-tabs">
                                <span className="active">Recent</span>
                                <span>Completed</span>
                            </div>
                        </div>

                        <div className="orders-list">
                            {recentOrders.map(order => (
                                <div key={order.id} className="order-card glass-panel">
                                    <div className={`order-icon ${order.type === 'Payout' ? 'payout' : 'food'}`}>
                                        {order.type === 'Payout' ? '💵' : '🍜'}
                                    </div>
                                    <div className="order-details">
                                        <h4>{order.item}</h4>
                                        <p>{order.customer} • {order.time}</p>
                                    </div>
                                    <div className="order-price">
                                        <span className={order.price.startsWith('+') ? 'positive' : 'negative'}>{order.price}</span>
                                    </div>
                                    <div className="order-status">
                                        <span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Right Column (Side Panel) */}
                    <div className="side-column">
                        {/* Staff / Contacts */}
                        <div className="side-panel glass-panel">
                            <div className="panel-header">
                                <h3>Staff Status</h3>
                                <span className="search-icon">🔍</span>
                            </div>
                            <div className="staff-list">
                                {staff.map((s, i) => (
                                    <div key={i} className="staff-item">
                                        <div className="staff-avatar">{s.img}</div>
                                        <div className="staff-info">
                                            <h4>{s.name}</h4>
                                            <p>{s.role}</p>
                                        </div>
                                        <div className={`online-dot ${s.status === 'On Duty' ? 'online' : 'offline'}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Notifications / Tasks */}
                        <div className="side-panel glass-panel alert-panel">
                            <div className="panel-header">
                                <h3>⚠️ Action Required</h3>
                            </div>
                            <div className="task-list">
                                {checklist.map(task => (
                                    <div key={task.id} className="task-item">
                                        <div className={`checkbox ${task.done ? 'checked' : ''}`}>{task.done ? '✓' : ''}</div>
                                        <span>{task.task}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="promo-box">
                                <span>🔥 Low Stock: Ghee</span>
                                <button className="small-btn">Order →</button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
