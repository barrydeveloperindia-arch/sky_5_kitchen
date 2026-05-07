import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Workforce Fix (already done partially, but let's ensure consistency)
// Search for the end of Workforce tab
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?\) \}\s*?\n\s*?\n\s*?\{activeTab === 'Attendance'/m, '                        </div>\n                    </div>\n                )}\n\n                {activeTab === \'Attendance\'');

// Attendance Fix
// Search for the end of Attendance tab
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?\) \}\s*?\n\s*?\n\s*?\{activeTab === 'Finance'/m, '                            </div>\n                        </div>\n                    </div>\n                )}\n\n                {activeTab === \'Finance\'');

// Finance Fix
// Search for the end of Finance tab
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?\) \}\s*?\n\s*?\n\s*?\{activeTab === 'Menu Config'/m, '                        </div>\n                    </div>\n                )}\n\n                {activeTab === \'Menu Config\'');

fs.writeFileSync(path, content);
console.log('Fixed tag soup!');
