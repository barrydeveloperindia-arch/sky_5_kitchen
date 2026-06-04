
const fs = require('fs');
const content = fs.readFileSync('c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx', 'utf8');

function countJSXTags(text) {
    let openDivs = 0;
    let closeDivs = 0;
    
    // Simple regex for <div> and </div>
    // This is naive but might help
    const openMatches = text.match(/<div(\s|>)/g) || [];
    const closeMatches = text.match(/<\/div>/g) || [];
    
    console.log(`Total <div: ${openMatches.length}`);
    console.log(`Total </div: ${closeMatches.length}`);
    
    // Let's also check <main and </main
    const openMain = text.match(/<main(\s|>)/g) || [];
    const closeMain = text.match(/<\/main>/g) || [];
    console.log(`Total <main: ${openMain.length}`);
    console.log(`Total </main: ${closeMain.length}`);

    // Let's also check <aside and </aside
    const openAside = text.match(/<aside(\s|>)/g) || [];
    const closeAside = text.match(/<\/aside>/g) || [];
    console.log(`Total <aside: ${openAside.length}`);
    console.log(`Total </aside: ${closeAside.length}`);
}

countJSXTags(content);
