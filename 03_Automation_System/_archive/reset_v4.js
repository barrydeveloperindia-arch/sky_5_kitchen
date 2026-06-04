import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Strip all tailing divs/main/fragment/returns
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?<\/main>\s*?<\/div>\s*?<\/?>\s*?\);\s*?\}\s*?\n\s*?export default AdminDashboard;/m, '');
content = content.replace(/<\/div>\s*?<\/main>\s*?<\/div>\s*?<\/?>\s*?\);\s*?\}\s*?\n\s*?export default AdminDashboard;/m, '');
content = content.replace(/<\/main>[\s\S]*?export default AdminDashboard;/m, '');

// Re-add exactly what's needed
const tail = `                </div>
            </main>
        </div>
        </>
    );
}

export default AdminDashboard;`;

// Find the last )} which marks the end of the tabsContent
const lastClosure = content.lastIndexOf(')}');
const truncated = content.substring(0, lastClosure + 2);

fs.writeFileSync(path, truncated + "\n" + tail);
console.log('Structural Reset v4 Complete!');
