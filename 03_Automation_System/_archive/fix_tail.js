import fs from 'fs';

const path = 'c:/Users/SAM/Documents/Antigravity/Hotal_Sky5/02_Application_Source/components/AdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// Find the last )}
const lastClosure = content.lastIndexOf(')}');
const head = content.substring(0, lastClosure + 2);

// Depth is 3, so we need 3 divs to close the tabs
// Then close main and root
const tail = `
                </div>
            </div>
        </div>
    </main>
</div>
</>
    );
}

export default AdminDashboard;
`;

fs.writeFileSync(path, head + tail);
console.log('Final Tail Set!');
