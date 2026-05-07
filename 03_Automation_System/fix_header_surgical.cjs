
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Find the line "Dashboard Operation Console" or similar
const headerStart = lines.findIndex(l => l.includes("<header") && l.includes("marginBottom"));
if (headerStart !== -1) {
    // Check if next lines are stray divs
    if (lines[headerStart + 1].trim() === "</div>") {
        console.log("Found stray at", headerStart + 1);
        lines.splice(headerStart + 1, 1);
    }
    // Check again (since they shift)
    if (lines[headerStart + 1].trim() === "</div>") {
        console.log("Found another stray at", headerStart + 1);
        lines.splice(headerStart + 1, 1);
    }
}

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Fixed header strays.');
