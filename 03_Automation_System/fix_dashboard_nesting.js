
const fs = require('fs');
const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Target the specific messy block in Workforce
const target = `                                    </div>
                            </div>
                        </div>
                        </div>
                        </div>
                        </div>
                    </div>
                )}`;

const replacement = `                                    </div>
                                </div>
                            </div>
                        )}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    console.log('Fixed Workforce modal closure.');
} else {
    console.log('Target block not found precisely. Trying fuzzy match...');
    // Try to find it regardless of exact whitespace on the empty-ish lines
    const regex = /<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+<\/div>\s+\)\}/;
    if (regex.test(content)) {
        content = content.replace(regex, '</div>\n                            </div>\n                        </div>\n                    )}');
        console.log('Fixed Workforce modal closure via regex.');
    } else {
        console.log('Fuzzy match also failed.');
    }
}

// Also check the end of Workforce tab
const endTarget = `                        </div>
                        </div>
                        </div>
                        </div>
                    </div>
                )}`;

const endReplacement = `                        </div>
                    </div>
                )}`;

if (content.includes(endTarget)) {
    content = content.replace(endTarget, endReplacement);
    console.log('Fixed Workforce tab end.');
}

fs.writeFileSync(path, content);
