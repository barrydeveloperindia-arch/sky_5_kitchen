import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Workforce
content = content.replace(/\{activeTab === 'Workforce' && \(\s*?<div/, "{activeTab === 'Workforce' && (<>\n<div");
content = content.replace(/<\/div>\s*?<\/div>\s*?\) \}\s*?\n\s*?\n\s*?\{activeTab === 'Attendance'/m, "</div>\n</div>\n</>\n)}\n\n{activeTab === 'Attendance'");

// Attendance
content = content.replace(/\{activeTab === 'Attendance' && \(\s*?<div/, "{activeTab === 'Attendance' && (<>\n<div");
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?\) \}\s*?\n\s*?\n\s*?\{activeTab === 'Finance'/m, "</div>\n</div>\n</div>\n</>\n)}\n\n{activeTab === 'Finance'");

// Finance
content = content.replace(/\{activeTab === 'Finance' && \(\s*?<div/, "{activeTab === 'Finance' && (<>\n<div");
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?\) \}\s*?\n\s*?\n\s*?\{activeTab === 'Menu Config'/m, "</div>\n</div>\n</div>\n</>\n)}\n\n{activeTab === 'Menu Config'");

fs.writeFileSync(path, content);
console.log('Stabilized with fragments!');
