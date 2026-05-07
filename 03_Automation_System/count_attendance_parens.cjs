
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');
let inAttendance = false;
let opens = 0;
let closes = 0;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes("{activeTab === 'Attendance'")) inAttendance = true;
    if (line.includes("{activeTab === 'Finance'")) inAttendance = false;
    
    if (inAttendance) {
        opens += (line.match(/\(/g) || []).length;
        closes += (line.match(/\)/g) || []).length;
    }
}
console.log('Attendance Parens Opens:', opens, 'Attendance Parens Closes:', closes);
