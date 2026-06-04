
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Find the header start
const headerLine = lines.findIndex(l => l.includes("<header") && l.includes("justifyContent"));
if (headerLine !== -1) {
    // Remove stray divs after header
    let i = headerLine + 1;
    while (lines[i].trim() === "</div>") {
        lines.splice(i, 1);
    }
}

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Removed stray divs after header.');
