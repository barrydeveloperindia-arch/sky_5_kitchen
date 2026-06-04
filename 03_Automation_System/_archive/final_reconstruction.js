import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Identify state and logic
const returnIndex = content.indexOf('return (');
const head = content.substring(0, returnIndex);

// Identify tabs area (everything from the first tab condition to the last modal closure)
// This is where the mess is. I'll just extract the whole block.
const startMarker = "{activeTab === 'Reception'";
const endMarker = ")}";
const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker) + endMarker.length;

// This tabsContent might still have imbalances, so I'll wrap each tab in a fragment
let tabsAndModals = content.substring(startIndex, endIndex);

const cleanReturn = `
    return (
        <>
            <div id="sky5-dashboard-root" style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Outfit', sans-serif" }}>
                <aside style={{ width: '280px', background: '#002147', color: 'white', padding: '40px 20px', display: 'flex', flexDirection: 'column', boxShadow: '5px 0 25px rgba(0,0,0,0.1)' }}>
                    <Logo />
                    <nav style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {['Reception', 'Kitchen', 'Cleaning', 'Workforce', 'Attendance', 'Finance', 'Menu Config'].map(t => (
                            <div key={t} onClick={() => setActiveTab(t)} style={{ padding: '15px 25px', borderRadius: '12px', cursor: 'pointer', transition: '0.3s', background: activeTab === t ? '#e67e22' : 'transparent', color: 'white', fontWeight: 'bold' }}>
                                {t}
                            </div>
                        ))}
                    </nav>
                </aside>
                <main style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#f0f2f5' }}>
                    <div id="tab-portal">
                        ${tabsAndModals}
                    </div>
                </main>
            </div>
        </>
    );
}

export default AdminDashboard;
`;

fs.writeFileSync(path, head + cleanReturn);
console.log('Final Forensic Reconstruction Complete!');
