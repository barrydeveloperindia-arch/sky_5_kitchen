import fs from 'fs';
import { combos } from '../02_Application_Source/data/combos.js';
fs.writeFileSync('03_Automation_System/combos.json', JSON.stringify(combos, null, 2), 'utf8');
console.log('Dumped combos to JSON successfully!');
