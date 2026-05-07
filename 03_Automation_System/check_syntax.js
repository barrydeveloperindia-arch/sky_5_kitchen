import fs from 'fs';

const content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let angleCount = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
}

console.log(`Braces: ${braceCount}`);
console.log(`Parens: ${parenCount}`);
