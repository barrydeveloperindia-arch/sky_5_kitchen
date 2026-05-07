import { test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

test('Integration: CCTV Surveillance System Configuration', () => {
    const configPath = path.join(process.cwd(), '03_Automation_System', 'cctv_config.json');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    expect(config.dvr_brand).toBe('CP Plus');
    expect(config.camera_brand).toBe('W Box');
    expect(config.channels.length).toBeGreaterThan(0);
    console.log(`✅ Integration: CCTV Config verified for ${config.channels.length} channels.`);
});

test('Integration: CCTV Audit Log Health', () => {
    const logPath = path.join(process.cwd(), '06_Forensic_Logs', 'cctv_audit.log');
    expect(fs.existsSync(logPath)).toBe(true);
    
    const content = fs.readFileSync(logPath, 'utf8');
    expect(content).toContain('INITIALIZED');
    expect(content).toContain('RTSP Link established');
    console.log("✅ Integration: CCTV Audit Log confirmed healthy and active.");
});
