import { describe, test, expect, vi } from 'vitest';

vi.mock('../../02_Application_Source/lib/firebase', () => ({ getServices: () => ({}), whenSignedIn: () => Promise.resolve() }));
const { pinHash, PIN_RE } = await import('../../02_Application_Source/lib/staffPin');

describe('staff PIN hash', () => {
    test('64 hex characters, depends on staff ID and PIN, never contains the PIN itself', async () => {
        const a = await pinHash('SKY5-004', '0315');
        expect(a).toMatch(/^[0-9a-f]{64}$/);
        expect(a).toBe(await pinHash('SKY5-004', '0315'));
        expect(a).not.toBe(await pinHash('SKY5-004', '0316'));
        expect(a).not.toBe(await pinHash('SKY5-003', '0315'));   // same PIN, another person = another hash
        expect(a).not.toContain('0315');
    });
    test('only 4 digits are a PIN', () => {
        expect(PIN_RE.test('0315')).toBe(true);
        expect(PIN_RE.test('315')).toBe(false);
        expect(PIN_RE.test('12345')).toBe(false);
        expect(PIN_RE.test('12a4')).toBe(false);
    });
});
