import React from 'react';
import hotelLogo from '../assets/hotel_logo.jpg';

const Logo = ({ size = 60 }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <img 
            src={hotelLogo} 
            alt="Hotel Sky 5 Logo" 
            style={{ 
                width: size, 
                height: size, 
                borderRadius: '12px', 
                border: '1px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                objectFit: 'cover'
            }} 
        />
    </div>
);

export default Logo;
