
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');
let inFinance = false;
let opens = 0;
let closes = 0;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes("{activeTab === 'Finance'")) inFinance = true;
    if (line.includes("{activeTab === 'Menu Config'")) inFinance = false;
    
    if (inFinance) {
        let cleanLine = line.replace(/<textarea.*?\/>/g, '').replace(/<input.*?\/>/g, '').replace(/<img.*?\/>/g, '');
        opens += (cleanLine.match(/<div(\s|>)/g) || []).length;
        closes += (cleanLine.match(/<\/div>/g) || []).length;
    }
}
console.log('Finance Opens:', opens, 'Finance Closes:', closes);
