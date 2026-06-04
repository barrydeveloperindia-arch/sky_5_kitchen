
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Remove 1749, 1750 (which are now shifted)
// I'll search for the block
const target = "                )}\n                            </div>\n                            </div>\n\n                {activeTab === 'Menu Config'";
const fix = "                )}\n\n                {activeTab === 'Menu Config'";

content = content.replace(target, fix);

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
console.log('Removed stray divs at 1749-1750.');
