import { describe, test, expect } from 'vitest';
import { buildAttendanceSpeech, firstName } from '../../02_Application_Source/lib/voice';

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
