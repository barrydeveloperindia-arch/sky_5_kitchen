
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Guest Modal (Body closure)
const guestBody = lines.findIndex(l => l.includes("Modal Footer") && l.includes("Guest"));
if (guestBody !== -1) {
    lines.splice(guestBody - 1, 0, "                            </div>");
}

// Cleaning Modal (Body closure)
const cleaningBody = lines.findIndex(l => l.includes("CLEANING LOG"));
let cleaningEnd = -1;
for (let i = cleaningBody; i < lines.length; i++) {
    if (lines[i].includes("CANCEL") && lines[i].includes("setCleaningRoom")) {
        cleaningEnd = i;
        break;
    }
}
if (cleaningEnd !== -1) {
    lines.splice(cleaningEnd - 1, 0, "                            </div>");
}

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Fixed modals.');
