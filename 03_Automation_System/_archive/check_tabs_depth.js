import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "{activeTab === 'Reception'";
const endMarker = ")}";
const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker) + endMarker.length;
const tabsContent = content.substring(startIndex, endIndex);

const tags = tabsContent.match(/<div(?!.*?\/>)|<\/div>/g);
let depth = 0;
if (tags) {
    tags.forEach(t => { if (t === '</div>') depth--; else depth++; });
}

console.log('TabsContent Depth:', depth);
