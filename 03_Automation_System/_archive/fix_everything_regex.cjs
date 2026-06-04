
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

// Workforce
content = content.replace(
    /\)\)\}\s+<\/div>\s+<\/div>\s+\)\}/,
    "))}\n                        </div>\n                        </div>\n                        </div>\n                        </div>\n                    </div>\n                )}"
);

// Finance
content = content.replace(
    /<\/div>\s+<\/div>\s+<\/div>\s+\)\}/,
    "</div>\n                            </div>\n                        </div>\n                        </div>\n                        </div>\n                        </div>\n                    </div>\n                )}"
);

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
console.log('Fixed everything (Regex Final).');
