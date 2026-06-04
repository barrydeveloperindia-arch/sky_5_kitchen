
const fs = require('fs');
const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<div(\s|>)/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    const mainOpens = (line.match(/<main(\s|>)/g) || []).length;
    const mainCloses = (line.match(/<\/main>/g) || []).length;
    const sectionOpens = (line.match(/<section(\s|>)/g) || []).length;
    const sectionCloses = (line.match(/<\/section>/g) || []).length;
    const asideOpens = (line.match(/<aside(\s|>)/g) || []).length;
    const asideCloses = (line.match(/<\/aside>/g) || []).length;
    const headerOpens = (line.match(/<header(\s|>)/g) || []).length;
    const headerCloses = (line.match(/<\/header>/g) || []).length;
    
    depth += opens - closes + mainOpens - mainCloses + sectionOpens - sectionCloses + asideOpens - asideCloses + headerOpens - headerCloses;
    
    console.log(`${i + 1}: ${depth}`);
}
