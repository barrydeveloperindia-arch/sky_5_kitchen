import React from 'react';

const Logo = ({ size = 60, noBorder = false }) => (
    <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        background: 'var(--primary-navy)', 
        padding: '10px 20px', 
        borderRadius: '12px',
        borderLeft: '4px solid #d4af37',
        boxShadow: noBorder ? 'none' : '0 8px 25px rgba(0,0,0,0.3)',
        minWidth: 'fit-content'
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
            <div style={{ fontSize: `${size * 0.25}px`, color: 'white', letterSpacing: '1px', fontWeight: '500', textTransform: 'uppercase' }}>Hotel</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: `${size * 0.5}px`, fontWeight: '900', color: '#d4af37', fontFamily: 'Cinzel, serif', letterSpacing: '2px' }}>SKY</div>
                <div style={{ fontSize: `${size * 0.7}px`, fontWeight: '900', color: '#d4af37', fontFamily: 'Cinzel, serif' }}>5</div>
            </div>
        </div>
    </div>
);

export default Logo;
