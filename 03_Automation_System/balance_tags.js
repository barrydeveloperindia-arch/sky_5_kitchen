import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const divOpen = (content.match(/<div(?!.*?\/>)/g) || []).length;
const divClose = (content.match(/<\/div>/g) || []).length;

console.log('Balance check - divs:', divOpen, 'closeDivs:', divClose);

if (divOpen > divClose) {
    const missing = divOpen - divClose;
    console.log(`Adding ${missing} missing divs...`);
    const addition = '</div>\n'.repeat(missing);
    // Add them before </main> at the end
    content = content.replace('            </main>', addition + '            </main>');
}

fs.writeFileSync(path, content);
console.log('Balanced!');
