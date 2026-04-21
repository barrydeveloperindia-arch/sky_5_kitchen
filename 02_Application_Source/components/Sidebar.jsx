import React from 'react';

function Sidebar({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'dashboard', icon: '🏠', label: 'Home' },
        { id: 'orders', icon: '📋', label: 'Orders' },
        { id: 'staff', icon: '👥', label: 'Staff' },
        { id: 'analytics', icon: '📊', label: 'Reports' },
        { id: 'settings', icon: '⚙️', label: 'Settings' },
    ];

    return (
        <div className="glass-sidebar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                    title={tab.label}
                >
                    <span className="sidebar-icon">{tab.icon}</span>
                </button>
            ))}

            <div className="sidebar-footer">
                <button className="sidebar-btn logout" title="Logout">
                    <span className="sidebar-icon">↪️</span>
                </button>
            </div>
        </div>
    );
}

export default Sidebar;
