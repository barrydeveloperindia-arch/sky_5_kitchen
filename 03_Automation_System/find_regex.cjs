const fs = require('fs');
const content = fs.readFileSync('02_Application_Source/components/AdminDashboard.jsx', 'utf8');

let inString = false;
let quoteChar = '';
let inComment = false;
let inRegex = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i+1];
    
    if (inComment) {
        if (char === '\n') inComment = false;
        continue;
    }
    
    if (inString) {
        if (char === quoteChar && content[i-1] !== '\\') inString = false;
        continue;
    }
    
    if (char === '/' && next === '/') {
        inComment = true;
        i++;
        continue;
    }
    
    if (char === '"' || char === "'" || char === '`') {
        inString = true;
        quoteChar = char;
        continue;
    }
    
    if (char === '/') {
        // Potential regex or tag closer
        // Tag closers are handled by looking at previous char or following char
        if (next === '>') continue; // />
        if (content[i-1] === '<') continue; // </
        
        console.log(`Potential Regex start at line ${content.substring(0, i).split('\n').length}: ${content.substring(i, i+20)}`);
    }
}
