
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

// Fix Workforce: Find the broken sequence and replace with correct one
const brokenWF = /<\/div>\s+<\/div>\s+<\/div>\s+}}\)\s+<\/div>\s+<\/div>\s+}<\/div>\s+\)}/;
// No, I'll use map search.

const wfBlock = content.indexOf('SPECIAL DUTY ALERT');
if (wfBlock !== -1) {
    let part = content.slice(wfBlock, wfBlock + 1000);
    // Find the broken map end
    const mapEnd = part.indexOf('))}');
    if (mapEnd !== -1) {
        // We want to replace from after the last </div> before ))} to after the tab ends
        // But it's easier to just rebuild the tail of the tab.
    }
}

// I'll just use a VERY simple string replacement for the WHOLE block.
// I'll get the block from view_file and use it as a literal.

const targetWF = `                                </div>\n                        </div>\n                        </div>\n                            ))}\n                        </div>\n                        </div>\n                    </div>\n                )}`;
const fixWF = `                                </div>\n                            ))}\n                        </div>\n                        </div>\n                        </div>\n                        </div>\n                    </div>\n                )}`;

content = content.replace(targetWF, fixWF);

const targetFN = `                                    <div style={{ fontSize: '0.7rem', color: '#2ecc71', marginTop: '5px' }}>Monthly Target: 78% Achieved</div>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                            </div>\n                            </div>\n                )}`;
const fixFN = `                                    <div style={{ fontSize: '0.7rem', color: '#2ecc71', marginTop: '5px' }}>Monthly Target: 78% Achieved</div>\n                                </div>\n                            </div>\n                        </div>\n                        </div>\n                    </div>\n                )}`;

content = content.replace(targetFN, fixFN);

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', content);
console.log('Fixed structure programmatically (Final attempt).');
