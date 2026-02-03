import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Config
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
    if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configFile);
    } else {
        console.warn("Config file not found, using defaults");
        config = { AUTO_DB_PUSH: true, AUTO_GITHUB_PUSH: true };
    }
} catch (e) {
    console.error("Failed to load config, using defaults", e);
}

const git = simpleGit();

// Mock DB implementation (File based for demo)
const DB_PATH = path.join(__dirname, 'db.json');
const FAILED_DB_PATH = path.join(__dirname, 'db_failed.json');

const DB = {
    commands: {
        insert: async (record) => {
            let data = [];
            try {
                if (fs.existsSync(DB_PATH)) {
                    data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
                }
            } catch (err) { }
            data.push(record);
            fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
            console.log(`[DB] Record inserted: ${record.command}`);
        }
    },
    failed_push: {
        insert: async (record) => {
             let data = [];
             try {
                 if (fs.existsSync(FAILED_DB_PATH)) {
                     data = JSON.parse(fs.readFileSync(FAILED_DB_PATH, 'utf8'));
                 }
             } catch (err) { }
             data.push(record);
             fs.writeFileSync(FAILED_DB_PATH, JSON.stringify(data, null, 2));
             console.log(`[DB] Failed push recorded: ${record.command}`);
        }
    }
};

async function saveToDatabase(commandName, payload) {
    if (!config.AUTO_DB_PUSH) return;
    const record = {
        command: commandName,
        data: payload,
        executedAt: new Date(),
        status: "COMPLETED"
    };
    await DB.commands.insert(record);
}

async function pushToGithub(commandName, payload) {
    if (!config.AUTO_GITHUB_PUSH) return;

    // Ensure logs directory exists at the project root
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const fileName = path.join(logsDir, `${commandName}_${Date.now()}.json`);
    fs.writeFileSync(fileName, JSON.stringify(payload, null, 2));

    try {
        await git.add(".");
        await git.commit(`AUTO: ${commandName} completed`);
        // Using 'origin main' as standard, can be configured
        await git.push("origin", "main");
        console.log(`[GitHub] Auto-pushed changes for ${commandName}`);
    } catch (error) {
        throw new Error(`Git Push Failed: ${error.message}`);
    }
}

export async function onCommandComplete(commandName, payload) {
    console.log(`\n🔹 [Antigraviti] Processing post-command hooks for: ${commandName}`);
    
    // Step 2: Auto Save to DB
    try {
        await saveToDatabase(commandName, payload);
    } catch (e) {
        console.error("DB Save Failed", e);
    }

    // Step 3 & 4: Auto Github Push with Fail-Safe
    try {
        await pushToGithub(commandName, payload);
    } catch (err) {
        console.error(`[Fail-Safe] Push failed: ${err.message}`);
        await DB.failed_push.insert({
            command: commandName,
            error: err.message,
            retry: true
        });
    }
}

// Helper to execute a function and trigger the hook
export async function execute(commandName, taskFunction) {
    console.log(`Executing ${commandName}...`);
    let payload = {};
    try {
        const result = await taskFunction();
        payload = { success: true, result };
    } catch (error) {
        payload = { success: false, error: error.message };
        console.error(`Command ${commandName} failed:`, error);
    }
    
    await onCommandComplete(commandName, payload);
}
