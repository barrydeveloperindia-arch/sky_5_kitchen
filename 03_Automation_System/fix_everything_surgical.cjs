
const fs = require('fs');
let content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

const lines = content.split('\n');

// 1. Workforce (Around line 1370)
const wfMarker = lines.findIndex(l => l.includes("{activeTab === 'Attendance'"));
lines.splice(wfMarker - 1, 0, "                        </div>", "                        </div>", "                        </div>", "                        </div>");

// 2. Finance (Around line 1750)
const fnMarker = lines.findIndex(l => l.includes("{activeTab === 'Menu Config'"));
lines.splice(fnMarker - 1, 0, "                            </div>", "                            </div>", "                            </div>", "                            </div>");

// 3. Modals
const guestMarker = lines.findIndex(l => l.includes("EXCLUDING GST"));
lines.splice(guestMarker + 2, 0, "                            </div>");

const cleaningMarker = lines.findIndex(l => l.includes("CANCEL") && l.includes("setCleaningRoom"));
lines.splice(cleaningMarker - 1, 0, "                            </div>");

fs.writeFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', lines.join('\n'));
console.log('Final surgical balance complete.');
