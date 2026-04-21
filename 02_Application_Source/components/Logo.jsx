import React from 'react';

const Logo = ({ size = 40, color = "#d4af37" }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" stroke={color} strokeWidth="2" />
            <path d="M30 35H70L65 55H35L30 75H70" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ 
            fontFamily: 'Cinzel, serif', 
            fontSize: size * 0.25, 
            fontWeight: '900', 
            color: color, 
            marginTop: '5px',
            letterSpacing: '2px'
        }}>S5</span>
    </div>
);

export default Logo;
