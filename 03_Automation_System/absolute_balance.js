import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const tags = content.match(/<div(?!.*?\/>)|<\/div>/g);
let depth = 0;
tags.forEach(t => { if (t === '</div>') depth--; else depth++; });

console.log('Depth before fix:', depth);

if (depth > 0) {
    let closures = '';
    for (let i = 0; i < depth; i++) {
        closures += '</div>\n';
    }
    
    // Replace the tail
    content = content.replace('        </>\n    );\n}', closures + '        </>\n    );\n}');
}

fs.writeFileSync(path, content);
console.log('Final Balance Achieved!');
