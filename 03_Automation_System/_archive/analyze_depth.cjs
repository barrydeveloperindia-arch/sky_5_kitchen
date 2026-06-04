
const fs = require('fs');
const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/03_Automation_System/depth_log.txt';
const content = fs.readFileSync(path, 'utf16le'); // PowerShell output is UTF-16LE
const lines = content.split('\r\n');

for (const line of lines) {
    const parts = line.split(': ');
    if (parts.length === 2) {
        const lineNum = parts[0];
        const depth = parseInt(parts[1]);
        if (depth < 0) {
            console.log(`Negative depth at line ${lineNum}: ${depth}`);
        }
    }
}
