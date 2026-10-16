/**
 * HOTEL SKY 5 - spoken thank-you after a check-in / check-out (the same words as the AuraLock terminal).
 * Uses the phone's own voice: the staff app's text-to-speech plugin when it is there, else the browser's.
 * Speech must never get in the way of attendance, so every failure is silent.
 */
const VOICE_FLAG = 'sky5_voice';   // "0" = this phone stays silent
const LANG = 'en-IN';

export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || '';

// kind: 'in' | 'back' | 'out'; the hour picks the greeting (Indian time)
export function buildAttendanceSpeech(name, kind, date = new Date()) {
    const who = firstName(name);
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(date)) % 24;
    if (kind === 'out') return `Thank you${who ? ` ${who}` : ''}. Check out successful. ${hour >= 17 ? 'Have a good evening.' : 'Have a good day.'}`;
    if (kind === 'back') return `Welcome back${who ? ` ${who}` : ''}. Check in successful.`;
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${greet}${who ? ` ${who}` : ''}. Check in successful. Thank you.`;
}

export const isVoiceOn = () => { try { return localStorage.getItem(VOICE_FLAG) !== '0'; } catch { return true; } };

let last = { text: '', at: 0 };
export async function speak(text) {
    if (!text || !isVoiceOn() || typeof window === 'undefined') return;
    const now = Date.now();
    if (text === last.text && now - last.at < 3000) return;   // the same tap, said once
    last = { text, at: now };
    const tts = window.Capacitor?.Plugins?.TextToSpeech;   // inside the Hotel Sky 5 Staff app
    try {
        if (tts) { await tts.stop().catch(() => {}); await tts.speak({ text, lang: LANG, rate: 0.95, pitch: 1.0, volume: 1.0, category: 'ambient' }); return; }
    } catch { /* fall back to the browser voice */ }
    try {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = LANG; u.rate = 0.95;
            window.speechSynthesis.speak(u);
        }
    } catch { /* no voice on this phone: stay silent */ }
}
export const speakAttendance = (name, kind) => speak(buildAttendanceSpeech(name, kind));
