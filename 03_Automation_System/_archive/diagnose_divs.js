import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
let depth = 0;
let stack = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Find all <div (not self closing) and </div>
    const matches = line.match(/<div(?!.*?\/>)|<\/div>/g);
    if (matches) {
        matches.forEach(m => {
            if (m === '</div>') {
                depth--;
                if (depth < 0) {
                    console.log(`Extra </div> at line ${i + 1}`);
                    depth = 0;
                }
            } else {
                depth++;
                stack.push(i + 1);
            }
        });
    }
}

console.log('Final depth:', depth);
if (depth > 0) {
    console.log('Unclosed divs started at lines:', stack.slice(-depth));
}
