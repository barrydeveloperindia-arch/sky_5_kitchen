import { describe, test, expect, vi } from 'vitest';
import { buildAttendanceSpeech, chime, FAIL_SPEECH, firstName } from '../../02_Application_Source/lib/voice';

// 2026-10-16 times in India (UTC+5:30)
const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 16, h, m) - 330 * 60000);
describe('spoken thank-you (same words as AuraLock)', () => {
    test('check in by time of day, first name only', () => {
        expect(buildAttendanceSpeech('Varun Kumar', 'in', at(8))).toBe('Good morning Varun. Check in successful. Thank you.');
        expect(buildAttendanceSpeech('Bhawna', 'in', at(14))).toBe('Good afternoon Bhawna. Check in successful. Thank you.');
        expect(buildAttendanceSpeech('Ganga', 'in', at(19))).toBe('Good evening Ganga. Check in successful. Thank you.');
    });
    test('check out and back in', () => {
        expect(buildAttendanceSpeech('Varun', 'out', at(18))).toBe('Thank you Varun. Check out successful. Have a good evening.');
        expect(buildAttendanceSpeech('Varun', 'out', at(13))).toBe('Thank you Varun. Check out successful. Have a good day.');
        expect(buildAttendanceSpeech('Varun', 'back', at(15))).toBe('Welcome back Varun. Check in successful.');
        expect(firstName('  Mohammad Hafeez ')).toBe('Mohammad');
    });
});

describe('terminal tone', () => {
    test('the failure line is short and clear', () => {
        expect(FAIL_SPEECH).toBe('Face not recognised. Please try again.');
    });
    test('no sound support (or no window): nothing breaks', () => {
        expect(() => chime(true)).not.toThrow();
        expect(() => chime(false)).not.toThrow();
    });
    test('with sound: two short beeps, rising for done, low for not accepted', () => {
        const made = [];
        const osc = () => { const o = { type: '', frequency: { value: 0 }, connect: (g) => g, start: vi.fn(), stop: vi.fn() }; made.push(o); return o; };
        const gain = () => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: (d) => d });
        globalThis.window = { AudioContext: class { constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; } createOscillator() { return osc(); } createGain() { return gain(); } } };
        globalThis.localStorage = { getItem: () => null };
        chime(true);
        expect(made.map(o => o.frequency.value)).toEqual([880, 1320]);
        made.length = 0;
        chime(false);
        expect(made.map(o => o.frequency.value)).toEqual([330, 262]);
        delete globalThis.window; delete globalThis.localStorage;
    });
});
