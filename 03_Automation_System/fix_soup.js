import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Workforce tab closure
const workforceSearch = /<div style={{ position: 'relative', paddingLeft: '120px' }}>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>\s*?\) \}/m;
// Wait, regex is too risky.

// I'll just use simple string replacement for the unique blocks.

// Workforce Fix
content = content.replace(
    '                                </div>\n                            </div>\n                        </div>\n                )}',
    '                                </div>\n                            ))}\n                        </div>\n                    </div>\n                </div>\n                )}'
);

// Attendance Fix
content = content.replace(
    '                            </div>\n                        </div>\n                )}',
    '                            </div>\n                        </div>\n                    </div>\n                )}'
);

// Finance Fix
content = content.replace(
    '                        </div>\n                )}',
    '                        </div>\n                    </div>\n                )}'
);

fs.writeFileSync(path, content);
console.log('Fixed!');
