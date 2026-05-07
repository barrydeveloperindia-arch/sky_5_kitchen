import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

test('Integration: TimeStation Background Sync Data Integrity', () => {
    const dbPath = path.join(process.cwd(), '02_Application_Source', 'data', 'syncedAttendance.json');
    expect(fs.existsSync(dbPath)).toBe(true);
    
    const content = fs.readFileSync(dbPath, 'utf8');
    const logs = JSON.parse(content);
    
    expect(Array.isArray(logs)).toBe(true);
    if (logs.length > 0) {
        const sample = logs[0];
        expect(sample).toHaveProperty('staffName');
        expect(sample).toHaveProperty('time');
        expect(sample).toHaveProperty('activity');
        expect(sample).toHaveProperty('date');
        console.log(`✅ Integration: Found ${logs.length} synced records in local DB.`);
    } else {
        console.log("⚠️ Integration: Local DB is currently empty (waiting for sync).");
    }
});
