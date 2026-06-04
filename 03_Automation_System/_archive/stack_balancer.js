import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// I'll use a simple stack-based parser to find the depth at the end of return
const returnIndex = content.indexOf('return (');
const middle = content.substring(returnIndex);

let depth = 0;
let stack = [];

const tags = middle.match(/<[a-zA-Z0-9]+(?![^>]*\/>)|<\/[a-zA-Z0-9]+>/g);

if (tags) {
    tags.forEach(tag => {
        if (tag.startsWith('</')) {
            const name = tag.substring(2, tag.length - 1);
            if (stack[stack.length - 1] === name) {
                stack.pop();
            } else {
                console.log('Mismatch: found', name, 'but expected', stack[stack.length - 1]);
                // Forgiveness: just pop if it exists somewhere in stack
                const idx = stack.lastIndexOf(name);
                if (idx !== -1) {
                    stack.splice(idx, 1);
                }
            }
        } else {
            const name = tag.substring(1).split(' ')[0].replace('>', '');
            stack.push(name);
        }
    });
}

console.log('Final Stack:', stack);

if (stack.length > 0) {
    // We need to close these in reverse order
    let closures = '';
    stack.reverse().forEach(name => {
        closures += `</${name}>\n`;
    });
    
    // Add them before the final return closing
    content = content.replace('    );', closures + '    );');
}

fs.writeFileSync(path, content);
console.log('Stack Balanced!');
