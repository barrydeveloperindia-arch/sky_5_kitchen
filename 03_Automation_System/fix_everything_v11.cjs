
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// Workforce: Add 2
const wfMarker = lines.findIndex(l => l.includes("{activeTab === 'Attendance'"));
lines.splice(wfMarker - 1, 0, "                        </div>", "                        </div>");

// Finance: Add 1 (Wait! Marker will shift by 2)
const fnMarker = lines.findIndex(l => l.includes("{activeTab === 'Menu Config'"));
lines.splice(fnMarker - 1, 0, "                            </div>");

// Guest Modal
const guestMarker = lines.findIndex(l => l.includes("EXCLUDING GST"));
lines.splice(guestMarker + 2, 0, "                            </div>");

// Cleaning Modal
const cleaningMarker = lines.findIndex(l => l.includes("CANCEL") && l.includes("setCleaningRoom"));
lines.splice(cleaningMarker - 1, 0, "                            </div>");

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Final surgical balance (Correct counts) complete.');
