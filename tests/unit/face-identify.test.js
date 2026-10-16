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
const { identifyFace, MATCH_DISTANCE, MATCH_MARGIN } = await import('../../02_Application_Source/lib/faceMatch');

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
