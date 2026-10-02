// Wait until both Firebase emulators answer before any test starts
export default async function globalSetup() {
    const deadline = Date.now() + 90_000;
    for (const url of ['http://127.0.0.1:8181/', 'http://127.0.0.1:9199/']) {
        for (;;) {
            try { const r = await fetch(url); if (r.status < 500) break; } catch { /* not up yet */ }
            if (Date.now() > deadline) throw new Error(`Emulator not ready: ${url}`);
            await new Promise(r => setTimeout(r, 500));
        }
    }
}
