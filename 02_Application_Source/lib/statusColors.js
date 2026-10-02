/**
 * HOTEL SKY 5 - one set of stock-status colours for the app, the printable report and the PDF.
 * (inventory.css uses the same values; a unit test keeps them in sync.)
 * All pairs pass WCAG AA contrast (4.5:1).
 */
export const STATUS_COLORS = {
    'OK': { fg: '#126b33', bg: '#e8f5ec' },
    'REORDER': { fg: '#a31717', bg: '#fdecec' },
    'OUT OF STOCK': { fg: '#ffffff', bg: '#a31717' },
    'EXPIRED': { fg: '#ffffff', bg: '#a31717' },
    'CHECK COUNT': { fg: '#ffffff', bg: '#6b21a8' },
    'REFILL': { fg: '#874e05', bg: '#fdf4dc' },
    'SET MIN': { fg: '#565d6b', bg: '#f1f3f6' },
};
// Entry type colours (register): IN green, OUT orange, MOVE blue
export const ENTRY_COLORS = { IN: '#126b33', OUT: '#c2410c', TRANSFER: '#1d4ed8' };

export const statusClass = (s) => `st-${String(s).replace(/ /g, '-')}`;
// The colour a status is printed in when there is no pill background (PDF text): the solid colour
export const statusInk = (s) => { const c = STATUS_COLORS[s]; return c ? (c.fg === '#ffffff' ? c.bg : c.fg) : null; };
export const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export const statusCSS = () => Object.entries(STATUS_COLORS).map(([s, c]) => `.${statusClass(s)} { background: ${c.bg}; color: ${c.fg}; }`).join('\n');
