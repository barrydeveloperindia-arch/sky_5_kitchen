
const fs = require('fs');
const content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];

lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Find all <div and </div> on this line
    // Use a simple regex that accounts for some JSX patterns
    const divRegex = /<div(\s|>)|<\/div>/g;
    let match;
    while ((match = divRegex.exec(line)) !== null) {
        if (match[0].startsWith('<div')) {
            stack.push({ line: lineNum, content: line.trim() });
        } else {
            if (stack.length > 0) {
                stack.pop();
            } else {
                console.log(`Extra </div> at line ${lineNum}: ${line.trim()}`);
            }
        }
    }
});

console.log(`\nUnclosed <div> tags:`);
stack.forEach(s => {
    console.log(`Line ${s.line}: ${s.content}`);
});
