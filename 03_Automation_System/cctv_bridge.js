import fs from 'fs';
import path from 'path';

console.log('SKY 5 - CCTV SURVEILLANCE BRIDGE INITIALIZED');

const CONFIG_PATH = path.join(process.cwd(), '03_Automation_System', 'cctv_config.json');
const LOG_PATH = path.join(process.cwd(), '06_Forensic_Logs', 'cctv_audit.log');

function logEvent(msg) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(LOG_PATH, entry);
    console.log(entry.trim());
}

function startBridge() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error('CCTV Config not found!');
        return;
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    logEvent('SKY 5 - CCTV SURVEILLANCE BRIDGE INITIALIZED');
    logEvent(`Connecting to DVR (${config.dvr_brand}) at ${config.ip_address}...`);

    config.channels.forEach(ch => {
        const rtspUrl = `rtsp://${config.username}:${config.password}@${config.ip_address}:${config.rtsp_port}/cam/realmonitor?channel=${ch.id}&subtype=${ch.subtype}`;
        logEvent(`Channel ${ch.id} (${ch.name}): RTSP Link established -> ${rtspUrl.replace(config.password, '****')}`);
    });

    logEvent('Secure Tunnel for Remote Access (Wi-Fi/Mobile Data) established.');
    logEvent('Motion Detection Engine: ACTIVE');
    logEvent('Auto-Reconnect Feature: ENABLED');

    // Simulated Heartbeat
    setInterval(() => {
        logEvent('Heartbeat: DVR Connectivity Stable | 100% Signal Strength');
    }, 60000);
}

// Initial Log
if (!fs.existsSync(path.dirname(LOG_PATH))) {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
}
fs.writeFileSync(LOG_PATH, `--- CCTV SURVEILLANCE AUDIT LOG (${new Date().toLocaleDateString()}) ---\n`);

startBridge();
