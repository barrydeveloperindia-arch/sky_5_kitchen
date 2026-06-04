import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// First, remove the fragment wrapping I added earlier to avoid nested fragments
content = content.replace(/<>\n<div/g, '<div');
content = content.replace(/<\/div>\n<\/div>\n<\/div>\n<\/div>\n<\/?>\n\s*?\);\n\s*?\}\n\nexport default AdminDashboard;/m, '</div>\n</div>\n</div>\n</div>\n);\n}\n\nexport default AdminDashboard;');

const divOpen = (content.match(/<div(?!.*?\/>)/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;

console.log('Pre-balancing divs:', divOpen, 'closeDivs:', divClose);

if (divOpen > divClose) {
    const missing = divOpen - divClose;
    console.log(`Adding ${missing} missing divs...`);
    const addition = '</div>\n'.repeat(missing);
    // Force a clean termination
    content = content.replace(/<\/main>[\s\S]*?export default AdminDashboard;/m, `            </main>\n${addition}        </div>\n    );\n}\n\nexport default AdminDashboard;`);
}

fs.writeFileSync(path, content);
console.log('Force Balanced!');
