import https from 'https';
import fs from 'fs';
import path from 'path';

const API_KEY = '8j309w6jz71royx925pek4v2l8gnqmk6';
// Path relative to where the script is run (root)
const DB_PATH = path.join(process.cwd(), '02_Application_Source', 'data', 'syncedAttendance.json');

console.log('SKY 5 - ATTENDANCE BACKGROUND SERVICE INITIALIZED');
console.log('Database Path:', DB_PATH);

function sync() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todayLabel = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // "07-May"
    
    console.log(`[${now.toLocaleTimeString()}] Fetching live logs from TimeStation...`);
    
    const url = `https://api.mytimestation.com/v1.2/reports/EmployeeActivity?ReportID=17&Report_StartDate=${today}&Report_EndDate=${today}`;
    
    const options = {
        headers: {
            'Authorization': 'Basic ' + Buffer.from(API_KEY + ':').toString('base64')
        }
    };

    https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                const rows = data.split('\n').filter(r => r.trim());
                if (rows.length <= 1) {
                    console.log('No activity found for today yet.');
                    return;
                }

                const logs = rows.slice(1).map(row => {
                    const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
                    let name = cols[2];
                    if (name === 'Veervati') name = 'Veerwati';
                    
                    return {
                        staffName: name,
                        time: cols[5],
                        activity: cols[6],
                        date: todayLabel,
                        timestamp: new Date().getTime()
                    };
                });

                fs.writeFileSync(DB_PATH, JSON.stringify(logs, null, 2));
                console.log(`Successfully synced ${logs.length} events.`);
            } else {
                console.error(`API Error: ${res.statusCode}`);
            }
        });
    }).on('error', (err) => {
        console.error('Fetch failed:', err.message);
    });
}

// Start polling
sync();
setInterval(sync, 30000); // 30 seconds
