import fs from 'fs';

const content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];
lines.forEach((line, index) => {
    // Remove strings to avoid false positives
    const cleanLine = line.replace(/`[\s\S]*?`|'[\s\S]*?'|"[\s\S]*?"/g, '');
    
    // Count open tags that are NOT self-closing
    // Regex for <div... but not ending with />
    const divOpenMatches = cleanLine.match(/<div(?!.*?\/>)/g) || [];
    const divCloseMatches = cleanLine.match(/<\/div>/g) || [];

    divOpenMatches.forEach(() => stack.push(index + 1));
    divCloseMatches.forEach(() => {
        if (stack.length > 0) stack.pop();
        else console.log(`Extra closing div at line ${index + 1}`);
    });
});

console.log('Final Unclosed div lines:', stack);
