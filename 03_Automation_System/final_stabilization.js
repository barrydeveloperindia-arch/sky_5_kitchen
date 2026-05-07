import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Wrap everything inside <main> in a fragment
content = content.replace('<main style={{ flex: 1, padding: \'50px\', overflowY: \'auto\' }}>', '<main style={{ flex: 1, padding: \'50px\', overflowY: \'auto\' }}>\n<div className="main-content-wrapper">');
content = content.replace('            </main>', '            </div>\n            </main>');

// Also ensure root fragment and container are correct
// Search for the very last part of the file
const endPart = /<\/main>\s*?<\/div>\s*?<\/?>\s*?\);\s*?\}\s*?\n\s*?export default AdminDashboard;/m;
if (!endPart.test(content)) {
    console.log("End part not found as expected, normalizing...");
    // Force a clean end
    content = content.replace(/<\/main>[\s\S]*?export default AdminDashboard;/m, '            </main>\n        </div>\n        </>\n    );\n}\n\nexport default AdminDashboard;');
}

fs.writeFileSync(path, content);
console.log('Main content wrapped and end normalized!');
