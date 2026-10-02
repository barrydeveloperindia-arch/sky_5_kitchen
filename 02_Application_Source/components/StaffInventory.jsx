import Logo from './Logo';
import InventoryView from './InventoryView';

// Standalone staff page (share link: /inventory). No access to the rest of the OPS Center.
function StaffInventory() {
    return (
        <div style={{ minHeight: '100vh', background: '#f0f2f5' }}>
            <header style={{ background: 'var(--primary-navy)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Logo size={40} />
                <div>
                    <div style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '1px' }}>INVENTORY</div>
                    <div style={{ color: '#8892b0', fontSize: '0.7rem' }}>Hotel Sky 5 · Staff stock entry</div>
                </div>
            </header>
            <main style={{ padding: '16px', maxWidth: '1400px', margin: '0 auto' }}>
                <InventoryView variant="staff" />
            </main>
        </div>
    );
}

export default StaffInventory;
