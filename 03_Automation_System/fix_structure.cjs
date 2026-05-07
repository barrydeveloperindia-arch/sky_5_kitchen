
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

// Fix Workforce: Add 4th div before )}
content = content.replace(
    /Staff Name <span style={{color: '#e74c3c'}}>(\*|\\\*)<\/span><\/label>([\s\S]*?)<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+\)}\s+\{activeTab === 'Attendance'/,
    (match) => match.replace(')}', '</div>\n                )}')
);

// Wait! That regex is too complex. 
// I'll just find the exact sequence of 3 divs and )} for Workforce.

const workforcePattern = /<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+\)}\s+\{activeTab === 'Attendance'/;
// Wait! Let's check how many divs are there currently.

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
