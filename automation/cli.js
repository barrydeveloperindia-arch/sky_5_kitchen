import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'config.json');

const args = process.argv.slice(2);

function updateConfig(updates) {
    let config = {};
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) { }

    const newConfig = { ...config, ...updates };
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
    return newConfig;
}

if (args[0] === 'automode' && args[1] === 'enable') {
    if (args.includes('--lifetime')) {
        console.log("🔒 LIFETIME AUTO MODE ENGAGED");
        const config = updateConfig({
            AUTO_MODE: "LIFETIME",
            DISABLE_MANUAL_OVERRIDE: true,
            AUTO_DB_PUSH: true,
            AUTO_GITHUB_PUSH: true
        });
        console.log("✔ Configuration Locked:");
        console.log(JSON.stringify(config, null, 2));
    } else {
        console.log("Enabled Auto Mode.");
        updateConfig({ AUTO_MODE: "ENABLED" });
    }
} else if (args[0] === 'status') {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("Current Status:", config);
} else if (args[0] === 'test' && args[1] === 'all') {
    console.log("🧪 Running System Verification Test...");
    import('child_process').then(({ spawn }) => {
        const child = spawn('node', [path.join(__dirname, 'test_flow.js')], { stdio: 'inherit', shell: true });
        child.on('close', (code) => {
            if (code === 0) {
                console.log("✅ Verification Complete.");
            } else {
                console.error("❌ Verification Failed.");
            }
        });
    });
} else {
    console.log("Unknown command. Usage:");
    console.log("  antigraviti automode enable --lifetime");
    console.log("  antigraviti test all");
}
