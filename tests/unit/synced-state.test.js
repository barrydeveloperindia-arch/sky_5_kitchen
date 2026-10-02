import { describe, test, expect } from 'vitest';
import { diffById, toFirestore, changedFields } from '../../02_Application_Source/lib/syncedState';

describe('diffById (which records a change must write)', () => {
    const a = { id: 1, status: 'Clean' };
    const b = { id: 2, status: 'Occupied' };
    test('only changed / new records are written', () => {
        const b2 = { ...b, status: 'Dirty' };
        const c = { id: 3, status: 'Clean' };
        const { upserts, deletes } = diffById([a, b], [a, b2, c]);
        expect(upserts).toEqual([b2, c]);
        expect(deletes).toEqual([]);
    });
    test('unchanged list writes nothing; removed record is reported', () => {
        expect(diffById([a, b], [a, b])).toEqual({ upserts: [], deletes: [] });
        expect(diffById([a, b], [a]).deletes).toEqual(['2']);
    });
    test('string and number ids match', () => {
        expect(diffById([{ id: 'ORD-1' }], [{ id: 'ORD-1', x: 1 }]).upserts).toHaveLength(1);
    });
});

describe('toFirestore', () => {
    test('drops undefined deeply, keeps null / 0 / false / arrays', () => {
        expect(toFirestore({ a: 1, b: undefined, c: { d: undefined, e: 0, f: null }, g: [{ h: undefined, i: false }] }))
            .toEqual({ a: 1, c: { e: 0, f: null }, g: [{ i: false }] });
    });
});

describe('QA night 1: concurrent-safe writes', () => {
    test('a repeated id is written once (first wins)', () => {
        const a = { id: 'X', v: 'new' }, b = { id: 'X', v: 'old' };
        expect(diffById([], [a, b]).upserts).toEqual([a]);
    });
    test('changedFields returns only what this device changed', () => {
        const before = { id: 3, status: 'Occupied', foodBill: 300, guest: { name: 'A' } };
        expect(changedFields(before, { ...before, status: 'Dirty' })).toEqual({ status: 'Dirty' });
        expect(changedFields(before, { ...before, guest: { name: 'A' } })).toEqual({});
        const removed = changedFields(before, { id: 3, status: 'Clean' });
        expect(Object.keys(removed).sort()).toEqual(['foodBill', 'guest', 'status']);
        expect(removed.foodBill).toBeUndefined();
    });
});
