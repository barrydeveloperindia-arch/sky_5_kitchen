
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');
let stack = [];
const selfClosing = ['input', 'img', 'br', 'hr', 'link', 'meta'];
let inBacktick = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineNum = i + 1;
    
    if (line.trim().startsWith('//')) continue;
    
    let currentLine = line;
    if (currentLine.includes('`')) {
        let parts = currentLine.split('`');
        if (parts.length % 2 === 0) inBacktick = !inBacktick;
    }
    if (inBacktick && !line.includes('`')) continue; 
    
    let cleanLine = line.replace(/\{`.*?`\}/g, '{}')
                        .replace(/".*?"/g, '""')
                        .replace(/'.*?'/g, "''")
                        .replace(/`.*?`/g, '""');
    
    let tokens = cleanLine.match(/<[a-z1-6]+(\s|>)|<\/[a-z1-6]+>/g) || [];
    
    tokens.forEach(token => {
        if (token.startsWith('</')) {
            let tag = token.slice(2, -1);
            if (selfClosing.includes(tag)) return;
            if (stack.length > 0) {
                stack.pop();
            }
        } else {
            let tag = token.match(/<([a-z1-6]+)/)[1];
            if (selfClosing.includes(tag)) return;
            if (cleanLine.includes(`${token.slice(0,-1)}/>`)) return;
            stack.push({ tag, line: lineNum });
        }
    });

    if (lineNum === 1373) {
        console.log(`Line 1373 stack: [${stack.map(s => `${s.tag}@${s.line}`).join(', ')}]`);
    }
}
