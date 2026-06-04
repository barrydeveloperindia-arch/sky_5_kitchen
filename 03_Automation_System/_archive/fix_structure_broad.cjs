
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

// Use a very broad regex to find Workforce ending
// Look for the map ending then some divs then )} then Attendance
const wfRegex = /SPECIAL DUTY ALERT[\s\S]*?\}\)\}\s+<\/div>\s+<\/div>\s+\)\}\s+\{activeTab === 'Attendance'/;
content = content.replace(wfRegex, (match) => {
    return match.replace('))}', '))}\n                        </div>\n                        </div>\n                        </div>\n                        </div>');
});

// Finance ending
const fnRegex = /FORECASTED COLLECTION[\s\S]*?<\/div>\s+<\/div>\s+<\/div>\s+\)\}\s+\{activeTab === 'Menu Config'/;
content = content.replace(fnRegex, (match) => {
    return match.replace(')}', '</div>\n                    )}');
});

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
console.log('Fixed structure (Broad Regex).');
