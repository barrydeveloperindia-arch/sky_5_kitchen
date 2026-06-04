
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Workforce: Find {activeTab === 'Attendance'
const wfLine = lines.findIndex(l => l.includes("{activeTab === 'Attendance'"));
if (wfLine !== -1) {
    // Insert 1 more div
    lines.splice(wfLine - 1, 0, "                        </div>");
}

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Fixed Workforce (One more div).');
