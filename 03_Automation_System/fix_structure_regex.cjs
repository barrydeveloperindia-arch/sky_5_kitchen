
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

// Fix Workforce: 
// It currently has: </div> (32) \n </div> (24) \n </div> (24) \n ))} (28) \n </div> (24) \n </div> (20) \n )} (16)
content = content.replace(
    /<\/div>\s+<\/div>\s+<\/div>\s+\)\)\}\s+<\/div>\s+<\/div>\s+\)\}/,
    "</div>\n                            ))}\n                        </div>\n                        </div>\n                        </div>\n                        </div>\n                    )}\n"
);

// Fix Finance: 
content = content.replace(
    /<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+\)\}/,
    "</div>\n                            </div>\n                        </div>\n                        </div>\n                        </div>\n                    )}\n"
);

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
console.log('Fixed structure programmatically (Regex v1).');
