import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// I'll take the first 1900 lines (state and logic)
const head = content.substring(0, content.indexOf('return ('));

// I'll take the tabs content again, but this time I'll be VERY careful
// I'll just search for the start and end of the tabs area
const startMarker = "{activeTab === 'Reception'";
const endMarker = ")}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker) + endMarker.length;

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const tabsContent = content.substring(startIndex, endIndex);

// Reconstruct a CLEAN component
const cleanComponent = `
${head}
    return (
        <div id="root-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8f9fa' }}>
            <aside style={{ width: '280px', background: '#002147', color: 'white', padding: '40px 20px' }}>
                <Logo />
                <nav style={{ marginTop: '50px' }}>
                    {['Reception', 'Kitchen', 'Cleaning', 'Workforce', 'Attendance', 'Finance', 'Menu Config'].map(tab => (
                        <div key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '15px', cursor: 'pointer', background: activeTab === tab ? '#e67e22' : 'transparent', borderRadius: '10px', marginBottom: '5px' }}>
                            {tab}
                        </div>
                    ))}
                </nav>
            </aside>
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <div id="safe-wrapper">
                    ${tabsContent}
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
`;

fs.writeFileSync(path, cleanComponent);
console.log('Component Rebuilt Cleanly!');
