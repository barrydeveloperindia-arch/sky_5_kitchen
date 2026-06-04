
const fs = require('fs');
const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let depth = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Very naive tag counting
    const opens = (line.match(/<div(\s|>)/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    
    // Check for other elements too
    const mainOpens = (line.match(/<main(\s|>)/g) || []).length;
    const mainCloses = (line.match(/<\/main>/g) || []).length;
    
    depth += opens - closes + mainOpens - mainCloses;
    
    if (depth < 0) {
        console.log(`Negative depth at line ${i + 1}: ${depth}`);
    }
}
console.log(`Final depth: ${depth}`);
