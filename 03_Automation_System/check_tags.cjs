
const fs = require('fs');
const content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

function checkBalance(text) {
    const stack = [];
    const openTags = ['{', '(', '['];
    const closeTags = ['}', ')', ']'];
    const map = { '}': '{', ')': '(', ']': '[' };

    let line = 1;
    let col = 1;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }

        if (openTags.includes(char)) {
            stack.push({ char, line, col });
        } else if (closeTags.includes(char)) {
            if (stack.length === 0 || stack[stack.length - 1].char !== map[char]) {
                console.log(`Unmatched closing tag ${char} at line ${line}, col ${col}`);
                // return; // Continue to find more
            } else {
                stack.pop();
            }
        }
    }

    if (stack.length > 0) {
        console.log(`Unclosed tags:`);
        stack.forEach(s => console.log(`${s.char} at line ${s.line}, col ${s.col}`));
    } else {
        console.log("All tags balanced");
    }
}

checkBalance(content);
