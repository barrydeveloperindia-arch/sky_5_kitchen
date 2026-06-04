import fs from 'fs';

const content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

let stack = [];
lines.forEach((line, index) => {
    const divOpen = line.match(/<div/g);
    const divClose = line.match(/<\/div/g);
    const selfClose = line.match(/\/>/g);

    if (divOpen) {
        divOpen.forEach(() => stack.push(index + 1));
    }
    if (divClose) {
        divClose.forEach(() => stack.pop());
    }
});

console.log('Unclosed div lines:', stack);
