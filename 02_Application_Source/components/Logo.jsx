import React from 'react';
import hotelLogo from '../assets/hotel_logo.jpg';

const Logo = ({ size = 60, noBorder = false }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img 
            src={hotelLogo} 
            alt="Hotel Sky 5 Logo" 
            style={{ 
                width: size, 
                height: size, 
                borderRadius: '12px', 
                border: noBorder ? 'none' : '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: noBorder ? 'none' : '0 4px 15px rgba(0,0,0,0.3)',
                objectFit: 'cover'
            }} 
        />
    </div>
);

export default Logo;
