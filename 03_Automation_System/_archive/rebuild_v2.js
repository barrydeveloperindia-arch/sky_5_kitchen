import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Identify state and logic
const returnIndex = content.indexOf('return (');
const exportIndex = content.lastIndexOf('export default AdminDashboard;');

const head = content.substring(0, returnIndex);

// Identify tabs area
const startMarker = "{activeTab === 'Reception'";
const endMarker = ")}";
const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker) + endMarker.length;
const tabsContent = content.substring(startIndex, endIndex);

const newReturn = `
    return (
        <div id="mobile-app-root" style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>
            <aside style={{ width: '280px', background: '#002147', color: 'white', padding: '40px 20px', display: 'flex', flexDirection: 'column' }}>
                <Logo />
                <nav style={{ marginTop: '50px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {['Reception', 'Kitchen', 'Cleaning', 'Workforce', 'Attendance', 'Finance', 'Menu Config'].map(t => (
                        <div key={t} onClick={() => setActiveTab(t)} style={{ padding: '15px', cursor: 'pointer', background: activeTab === t ? '#e67e22' : 'transparent', borderRadius: '10px' }}>
                            {t}
                        </div>
                    ))}
                </nav>
            </aside>
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <div className="tab-render-zone">
                    ${tabsContent}
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
`;

fs.writeFileSync(path, head + newReturn);
console.log('Structural Rebuild v2 Complete!');
