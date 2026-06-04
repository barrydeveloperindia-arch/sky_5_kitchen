
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');
let stack = [];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineNum = i + 1;
    
    if (line.trim().startsWith('//')) continue;
    
    let cleanLine = line.replace(/\{`.*?`\}/g, '{}')
                        .replace(/".*?"/g, '""')
                        .replace(/'.*?'/g, "''");
    
    let tokens = cleanLine.match(/<div(\s|>)|<\/div>/g) || [];
    
    if (tokens.length > 0 && (lineNum >= 1110 && lineNum <= 1140)) {
        console.log(`Line ${lineNum}: ${tokens.join(', ')}`);
    }

    tokens.forEach(token => {
        if (token.startsWith('<div')) {
            stack.push({ line: lineNum, token });
        } else {
            if (stack.length > 0) {
                stack.pop();
            }
        }
    });
}
