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
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1' }}>
            <div style={{ fontSize: `${size * 0.4}px`, fontWeight: '900', color: '#d4af37', fontFamily: 'Cinzel, serif', letterSpacing: '2px' }}>SKY</div>
            <div style={{ fontSize: `${size * 0.6}px`, fontWeight: '900', color: '#d4af37', fontFamily: 'Cinzel, serif', marginTop: '-5px' }}>5</div>
            <div style={{ fontSize: `${size * 0.15}px`, color: 'white', letterSpacing: '1px', marginTop: '5px', fontWeight: '500', textTransform: 'uppercase' }}>Boutique Hotel</div>
        </div>
    </div>
);

export default Logo;
