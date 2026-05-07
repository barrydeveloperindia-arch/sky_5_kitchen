
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Finance ending
const fnLine = lines.findIndex(l => l.includes("{activeTab === 'Menu Config'"));
if (fnLine !== -1) {
    // Insert 2 missing divs for Finance
    lines.splice(fnLine - 1, 0, "                            </div>", "                            </div>");
}

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Fixed Finance (2 more divs).');
