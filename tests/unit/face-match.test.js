import { describe, it, expect, vi } from 'vitest';

vi.mock('face-api.js', () => ({ nets: {}, TinyFaceDetectorOptions: class {} }));
vi.mock('../../02_Application_Source/lib/firebase', () => ({ getServices: () => ({}), whenSignedIn: () => Promise.resolve() }));
vi.mock('../../02_Application_Source/lib/syncedState', () => ({ trackWrite: (p) => p }));

const { faceQuality, sameFace, distance, faceKey, MATCH_DISTANCE } = await import('../../02_Application_Source/lib/faceMatch');
const desc = (v) => Array.from({ length: 128 }, () => v);
const face = (over = {}) => ({ descriptor: desc(0), score: 0.9, width: 200, ...over });

describe('faceQuality: only one clear, close face is accepted', () => {
    it('no face, two faces, too far, unclear are refused with a message', () => {
        expect(faceQuality([], 480)).toMatchObject({ ok: false, reason: expect.stringContaining('No face') });
        expect(faceQuality(null, 480).ok).toBe(false);
        expect(faceQuality([face(), face()], 480)).toMatchObject({ ok: false, reason: expect.stringContaining('More than one') });
        expect(faceQuality([face({ width: 60 })], 480)).toMatchObject({ ok: false, reason: expect.stringContaining('closer') });
        expect(faceQuality([face({ score: 0.55 })], 480)).toMatchObject({ ok: false, reason: expect.stringContaining('not clear') });
    });
    it('the face registered at a first check-in must be close, clear and straight', () => {
        expect(faceQuality([face({ width: 120 })], 480).ok).toBe(true);                       // 25%: fine for a check
        expect(faceQuality([face({ width: 120 })], 480, { register: true })).toMatchObject({ ok: false, reason: expect.stringContaining('come closer') });
        expect(faceQuality([face({ score: 0.7 })], 480, { register: true }).ok).toBe(false);
        expect(faceQuality([face({ yaw: 0.15 })], 480, { register: true })).toMatchObject({ ok: false, reason: expect.stringContaining('look straight') });
        expect(faceQuality([face({ yaw: 0.85 })], 480, { register: true }).ok).toBe(false);
        expect(faceQuality([face({ yaw: 0.5 })], 480, { register: true }).ok).toBe(true);
        expect(faceQuality([face({ yaw: 0.15 })], 480).ok).toBe(true);                        // a later check may be a little sideways
    });
    it('a good face passes and is returned', () => {
        const f = face();
        expect(faceQuality([f], 480)).toEqual({ ok: true, face: f });
    });
});

describe('sameFace', () => {
    it('same person within the limit, different person outside it', () => {
        expect(sameFace(desc(0.1), desc(0.1))).toEqual({ match: true, distance: 0 });
        const near = desc(0); near[0] = MATCH_DISTANCE - 0.01;
        expect(sameFace(near, desc(0)).match).toBe(true);
        const far = desc(0); far[0] = MATCH_DISTANCE + 0.01;
        expect(sameFace(far, desc(0)).match).toBe(false);
    });
    it('a missing or broken registered face never matches', () => {
        expect(sameFace(desc(0), null)).toEqual({ match: false, distance: null });
        expect(sameFace(desc(0), [1, 2, 3]).match).toBe(false);
        expect(distance(desc(0), undefined)).toBe(Infinity);
    });
});

describe('faceKey', () => {
    it('staff ID when there is one, else the name', () => {
        expect(faceKey({ staffId: 'SKY5-004', name: 'Varun' })).toBe('SKY5-004');
        expect(faceKey({ name: ' Amar  Singh ' })).toBe('name-amar-singh');
    });
});
