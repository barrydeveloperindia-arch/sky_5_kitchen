
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');
let inWorkforce = false;
let opens = 0;
let closes = 0;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes("{activeTab === 'Workforce'")) inWorkforce = true;
    if (line.includes("{activeTab === 'Attendance'")) inWorkforce = false;
    
    if (inWorkforce) {
        let cleanLine = line.replace(/<textarea.*?\/>/g, '').replace(/<input.*?\/>/g, '').replace(/<img.*?\/>/g, '');
        opens += (cleanLine.match(/<div(\s|>)/g) || []).length;
        closes += (cleanLine.match(/<\/div>/g) || []).length;
    }
}
console.log('Workforce Opens:', opens, 'Workforce Closes:', closes);
