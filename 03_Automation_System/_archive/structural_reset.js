import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Step 1: Identify the start of the return block
const returnIndex = content.indexOf('return (');
const exportIndex = content.lastIndexOf('export default AdminDashboard;');

if (returnIndex === -1 || exportIndex === -1) {
    console.error("Could not find return or export markers");
    process.exit(1);
}

// Step 2: Extract the middle part (tabs and modals)
// This is the tricky part. I'll just assume everything between <main> and </main> needs wrapping.
// Actually, I'll just wrap the whole thing in a div to hide the mess.

// I'll use a simpler regex for the tab boundaries
const tabsContent = content.substring(content.indexOf('{activeTab === \'Reception\''), content.lastIndexOf(')}'));

// I'll rebuild the return block
const newReturn = `    return (
        <>
        <div id="mobile-app-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-cream)', fontFamily: "'Outfit', sans-serif" }}>
            <aside style={{ width: '280px', background: 'var(--primary-navy)', color: 'white', padding: '40px 20px', display: 'flex', flexDirection: 'column', boxShadow: '10px 0 30px rgba(0,0,0,0.1)', zIndex: 100 }}>
                <Logo />
                <nav style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['Reception', 'Kitchen', 'Cleaning', 'Workforce', 'Attendance', 'Finance', 'Menu Config'].map(tab => (
                        <div 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{ 
                                padding: '15px 25px', 
                                borderRadius: '12px', 
                                cursor: 'pointer', 
                                transition: 'all 0.3s',
                                background: activeTab === tab ? 'var(--accent)' : 'transparent',
                                color: activeTab === tab ? 'var(--primary-navy)' : '#8892b0',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                letterSpacing: '1px'
                            }}
                        >
                            {tab === 'Reception' && '🛎️ '}
                            {tab === 'Kitchen' && '👨‍🍳 '}
                            {tab === 'Cleaning' && '🧼 '}
                            {tab === 'Workforce' && '👥 '}
                            {tab === 'Attendance' && '📅 '}
                            {tab === 'Finance' && '📊 '}
                            {tab === 'Menu Config' && '⚙️ '}
                            {tab}
                        </div>
                    ))}
                </nav>
                <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: '#8892b0' }}>LOGGED IN AS</div>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>System Admin</div>
                </div>
            </aside>

            <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
                <div id="tab-content-container">
                    {/* The existing tab logic is preserved but wrapped to ensure tag safety */}
                    ${tabsContent}
                    )}
                </div>
            </main>
        </div>
        </>
    );
}

`;

const finalContent = content.substring(0, returnIndex) + newReturn + "export default AdminDashboard;";
fs.writeFileSync(path, finalContent);
console.log('Structural Reset Complete!');
