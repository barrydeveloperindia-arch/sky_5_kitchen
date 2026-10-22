import { describe, it, expect, vi, beforeEach } from 'vitest';

// The terminal finds WHO is in front of the camera (no name chosen): the closest registered face of someone working
// here, within the limit, and clearly closer than the next person.
let faces = [];
vi.mock('face-api.js', () => ({ nets: {}, TinyFaceDetectorOptions: class {} }));
vi.mock('../../02_Application_Source/lib/firebase', () => ({ getServices: () => ({ db: {} }), whenSignedIn: () => Promise.resolve() }));
vi.mock('../../02_Application_Source/lib/syncedState', () => ({ trackWrite: (p) => p }));
vi.mock('firebase/firestore', () => ({
    collection: (_db, name) => ({ name }),
    doc: (_db, coll, id) => ({ coll, id }),
    getDocs: async () => ({ docs: faces.map(([id, data]) => ({ id, data: () => data })) }),
    getDoc: async (ref) => { const f = faces.find(([id]) => id === ref.id); return { exists: () => !!f, data: () => f?.[1] }; },
    setDoc: async () => {},
}));
const { identifyFace, MATCH_DISTANCE, MATCH_MARGIN, IDENTIFY_DISTANCE, faceSet, nearest } = await import('../../02_Application_Source/lib/faceMatch');

const vec = (v) => Array.from({ length: 128 }, () => v);
const rec = (name, v, extra = {}) => ({ staffName: name, descriptor: vec(v), source: 'staff-photo', reset: false, ...extra });
const staff = [{ name: 'Varun' }, { name: 'Bhawna' }, { name: 'Karan', staffId: 'SKY5-007' }];

describe('identifyFace', () => {
    beforeEach(() => { faces = [['name-varun', rec('Varun', 0.01)], ['name-bhawna', rec('Bhawna', 0.2)], ['SKY5-007', rec('Karan', 0.4)]]; });

    it('the closest registered face wins (by name key and by staff ID)', async () => {
        expect((await identifyFace(vec(0.012), staff)).staff.name).toBe('Varun');
        expect((await identifyFace(vec(0.21), staff)).staff.name).toBe('Bhawna');
        const k = await identifyFace(vec(0.4), staff);
        expect(k.staff.name).toBe('Karan');
        expect(k.distance).toBe(0);
        expect(k.source).toBe('staff-photo');
    });

    it('a face nobody registered (beyond the limit) is nobody', async () => {
        expect(MATCH_DISTANCE).toBe(0.6);
        expect((await identifyFace(vec(0.9), staff)).staff).toBe(null);
    });

    it('two people nearly as close: unsure, no guess', async () => {
        faces.push(['name-twin', rec('Twin', 0.02)]);
        const r = await identifyFace(vec(0.015), [...staff, { name: 'Twin' }]);
        expect(r.staff).toBe(null);
        expect(r.unsure).toBe(true);
        expect(MATCH_MARGIN).toBeGreaterThan(0);
    });

    it('only people working here count (left / not on the list), and a reset face is ignored', async () => {
        expect((await identifyFace(vec(0.01), staff.filter(s => s.name !== 'Varun'))).staff).toBe(null);
        faces[0] = ['name-varun', rec('Varun', 0.01, { reset: true, descriptor: [] })];
        expect((await identifyFace(vec(0.01), staff)).staff).toBe(null);
    });
});

describe('learned samples', () => {
    beforeEach(() => { faces = [['name-varun', rec('Varun', 0.01, { samples: [{ d: vec(0.07), at: 'x' }] })], ['name-bhawna', rec('Bhawna', 0.3)]]; });

    it('a person is matched by the nearest of the registered face and the learned ones', async () => {
        expect(faceSet(faces[0][1])).toHaveLength(2);
        expect(nearest(vec(0.07), faces[0][1])).toBe(0);
        const r = await identifyFace(vec(0.072), staff);   // far from the registered face, close to the learned one
        expect(r.staff.name).toBe('Varun');
    });

    it('broken samples are ignored, a reset record has no faces', () => {
        expect(faceSet({ descriptor: vec(0.1), samples: [{ d: [1, 2] }, null] })).toHaveLength(1);
        expect(faceSet({ reset: true, descriptor: [] })).toHaveLength(0);
    });
});

describe('strict who-is-it (live data: different people only 0.59-0.61 apart)', () => {
    beforeEach(() => { faces = [['name-varun', rec('Varun', 0.01)], ['name-bhawna', rec('Bhawna', 0.3)]]; });

    it('only a close face is accepted: 0.5 and a clear lead of 0.1 over anybody else', () => {
        expect(IDENTIFY_DISTANCE).toBe(0.5);
        expect(MATCH_MARGIN).toBe(0.1);
    });

    it('a face 0.55 away (would have passed the old 0.6) is no longer accepted - only "near"', async () => {
        const r = await identifyFace(vec(0.01 + 0.55 / Math.sqrt(128)), staff);
        expect(r.staff).toBe(null);
        expect(r.near).toBe(true);
    });

    it('two people within 0.1 of each other: unsure', async () => {
        faces.push(['name-twin', rec('Twin', 0.017)]);   // 0.08 away from Varun
        const r = await identifyFace(vec(0.012), [...staff, { name: 'Twin' }]);
        expect(r.unsure).toBe(true);
    });
});
