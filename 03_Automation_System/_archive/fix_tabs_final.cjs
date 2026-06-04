
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Workforce: Add 2
const wfLine = lines.findIndex(l => l.includes("{activeTab === 'Attendance'"));
if (wfLine !== -1) {
    lines.splice(wfLine - 1, 0, "                        </div>", "                        </div>");
}

// Finance: Remove 1
const fnLine = lines.findIndex(l => l.includes("{activeTab === 'Menu Config'"));
if (fnLine !== -1) {
    // Search for </div> before )}
    if (lines[fnLine - 2].trim() === "</div>") {
        lines.splice(fnLine - 2, 1);
    }
}

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Fixed tabs (Final Final).');
