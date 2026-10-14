import { describe, test, expect } from 'vitest';
import {
    allStaff, nextStaffId, normalizeMobile, validateStaff, addStaff, updateStaff, setStaffStatus, filterStaff, staffCounts, EMPTY_FORM,
} from '../../02_Application_Source/lib/staffDirectory';
import { staffNames } from '../../02_Application_Source/lib/staffAttendance';

const reg = () => ({
    reception: [{ id: 'R1', staffId: 'SKY5-008', name: 'Gaurav Panchal', role: 'Front Desk', phone: '9779395934' }],
    kitchen: [{ id: 'K1', staffId: 'SKY5-004', name: 'Varun', role: 'Kitchen Staff', phone: '7986962196' }],
    housekeeping: [{ id: 'H1', name: 'Bhawna', role: 'Housekeeping', phone: '' }],
    special: [{ id: 'S1', name: 'note' }],
});

describe('staff directory', () => {
    test('everyone with their department; special notes are not staff', () => {
        expect(allStaff(reg()).map(s => `${s.department}:${s.name}`)).toEqual(['reception:Gaurav Panchal', 'kitchen:Varun', 'housekeeping:Bhawna']);
        expect(allStaff(null)).toEqual([]);
    });

    test('next staff ID is one above the highest SKY5 number in use', () => {
        expect(nextStaffId(reg())).toBe('SKY5-009');
        expect(nextStaffId({})).toBe('SKY5-001');
        expect(nextStaffId({ kitchen: [{ id: 'K1', staffId: 'EL040' }, { id: 'K2', staffId: 'SKY5-014' }] })).toBe('SKY5-015');
    });

    test('mobile numbers are stored as 10 digits', () => {
        expect(normalizeMobile('+91 98887 02845')).toBe('9888702845');
        expect(normalizeMobile('098887-02845')).toBe('9888702845');
        expect(normalizeMobile('')).toBe('');
        expect(normalizeMobile('967389287')).toBe('967389287'); // 9 digits stays as typed, the form rejects it
        expect(normalizeMobile('+44 7700 900123')).toBe('+447700900123');   // foreign: kept with its country code
        expect(normalizeMobile('0044 7700 900123')).toBe('+447700900123');
        expect(normalizeMobile('+91 98887 02845')).toBe('9888702845');
    });

    test('form checks: name, post, department, 10-digit mobile, date', () => {
        expect(validateStaff({ ...EMPTY_FORM }, reg())).toMatchObject({ name: 'Name is required.', role: 'Post is required.' });
        expect(validateStaff({ ...EMPTY_FORM, name: 'Ganga', role: 'Front Desk', phone: '967389287' }, reg()).phone).toMatch(/10 digits/);
        expect(validateStaff({ ...EMPTY_FORM, name: 'Ganga', role: 'Front Desk', phone: '1234567890' }, reg()).phone).toMatch(/10 digits/);
        expect(validateStaff({ ...EMPTY_FORM, name: 'Ganga', role: 'Front Desk', department: 'spa' }, reg()).department).toBeTruthy();
        expect(validateStaff({ ...EMPTY_FORM, name: 'Ganga', role: 'Front Desk', joinDate: '13-10-2026' }, reg()).joinDate).toBeTruthy();
        expect(validateStaff({ ...EMPTY_FORM, name: 'Ganga', role: 'Front Desk', phone: '+91 96738 92870', joinDate: '2026-10-13' }, reg())).toEqual({});
    });

    test('duplicates blocked: same name (any case) or same mobile; editing yourself is fine', () => {
        expect(validateStaff({ ...EMPTY_FORM, name: ' varun ', role: 'Helper' }, reg()).name).toBe('varun is already in the staff list.');
        expect(validateStaff({ ...EMPTY_FORM, name: 'New One', role: 'Helper', phone: '+91 79869 62196' }, reg()).phone).toBe('This mobile is already saved for Varun.');
        expect(validateStaff({ ...EMPTY_FORM, name: 'Varun', role: 'Cook', department: 'kitchen', phone: '7986962196' }, reg(), 'K1')).toEqual({});
    });

    test('add: gets the next SKY5 ID, a unique record id, Active status, clean values', () => {
        const { registry, staff } = addStaff(reg(), { ...EMPTY_FORM, name: '  Ganga ', role: 'Front Desk', phone: '+91 96738 92870', joinDate: '2026-10-13' }, { photoId: 'SKY5-009' });
        expect(staff).toMatchObject({ id: 'R2', staffId: 'SKY5-009', name: 'Ganga', phone: '9673892870', status: 'Active', joinDate: '2026-10-13', photoId: 'SKY5-009' });
        expect(registry.reception).toHaveLength(2);
        expect(registry.special).toEqual(reg().special); // other lists untouched
        // record ids never collide even if a list was edited by hand
        const odd = { ...reg(), kitchen: [{ id: 'K2', name: 'A' }] };
        expect(addStaff(odd, { ...EMPTY_FORM, name: 'B', role: 'x', department: 'kitchen' }).staff.id).toBe('K3');
    });

    test('update keeps ID / status / photo and moves the person when the department changes', () => {
        const base = { ...reg(), kitchen: [{ id: 'K1', staffId: 'SKY5-004', name: 'Varun', role: 'Kitchen Staff', phone: '7986962196', status: 'Active', photoId: 'SKY5-004' }] };
        const moved = updateStaff(base, 'K1', { ...EMPTY_FORM, name: 'Varun', role: 'Room Service', department: 'housekeeping', phone: '7986962196' });
        expect(moved.kitchen).toHaveLength(0);
        expect(moved.housekeeping.at(-1)).toMatchObject({ id: 'K1', staffId: 'SKY5-004', role: 'Room Service', status: 'Active', photoId: 'SKY5-004' });
        expect(updateStaff(base, 'nobody', EMPTY_FORM)).toBe(base);
    });

    test('mark Left / Active again; Left staff are hidden from the phone attendance list', () => {
        const left = setStaffStatus(reg(), 'K1', 'Left', '2026-10-13');
        expect(left.kitchen[0]).toMatchObject({ status: 'Left', leftDate: '2026-10-13' });
        expect(staffNames(left).map(s => s.name)).toEqual(['Gaurav Panchal', 'Bhawna']);
        expect(setStaffStatus(left, 'K1', 'Active').kitchen[0]).toMatchObject({ status: 'Active', leftDate: '' });
    });

    test('search / filters / counts', () => {
        const list = allStaff(setStaffStatus(reg(), 'H1', 'Left'));
        expect(filterStaff(list).map(s => s.name)).toEqual(['Gaurav Panchal', 'Varun']);
        expect(filterStaff(list, { status: 'Left' }).map(s => s.name)).toEqual(['Bhawna']);
        expect(filterStaff(list, { status: 'all', search: 'sky5-004' }).map(s => s.name)).toEqual(['Varun']);
        expect(filterStaff(list, { status: 'all', search: '97793' }).map(s => s.name)).toEqual(['Gaurav Panchal']);
        expect(filterStaff(list, { status: 'all', dept: 'kitchen' }).map(s => s.name)).toEqual(['Varun']);
        expect(staffCounts(list)).toEqual({ total: 3, active: 2, left: 1, withPhoto: 0 });
    });
});
