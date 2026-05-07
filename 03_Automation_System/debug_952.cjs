
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');
let stack = [];
const selfClosing = ['input', 'img', 'br', 'hr', 'link', 'meta'];

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineNum = i + 1;
    
    if (line.trim().startsWith('//')) continue;
    
    let cleanLine = line.replace(/\{`.*?`\}/g, '{}')
                        .replace(/".*?"/g, '""')
                        .replace(/'.*?'/g, "''");
    
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
            if (line.includes(`<${tag}`) && line.includes('/>')) return;
            stack.push({ tag, line: lineNum });
        }
    });

    if (lineNum === 952) {
        console.log(`Line 952 stack: [${stack.map(s => `${s.tag}@${s.line}`).join(', ')}]`);
    }
}
