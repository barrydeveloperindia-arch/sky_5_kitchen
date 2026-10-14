import { describe, test, expect } from 'vitest';
import { to12h, boardToRows, presentNames, mergeLogs } from '../../02_Application_Source/lib/faceScans';

const board = { companies: [{ company: 'Sky5 Hotel', staff: [
    { name: 'Varun', employeeId: 'SKY5-004', status: 'Present', in: '08:18', out: '' },
    { name: 'Larissa', employeeId: 'SKY5-001', status: 'Present', in: '09:13', out: '17:40' },
    { name: 'Ganga', employeeId: 'SKY5-006', status: 'Not in yet', in: '', out: '' },
    { name: 'Veervati', employeeId: 'SKY5-003', status: 'Present', in: '10:02', out: '' },
] }] };
const at = new Date(2026, 9, 14, 12, 0);

describe('face scans in the register', () => {
    test('24 h board times become the register format', () => {
        expect(to12h('08:18')).toBe('08:18 AM');
        expect(to12h('17:40')).toBe('05:40 PM');
        expect(to12h('00:05')).toBe('12:05 AM');
        expect(to12h('12:30')).toBe('12:30 PM');
        expect(to12h('')).toBe('--');
    });
    test('one read-only row per person who scanned in today; not-in staff are left out; names from the hotel list by ID', () => {
        const rows = boardToRows(board, [{ staffId: 'SKY5-003', name: 'Veerwati' }], at);
        expect(rows.map(r => [r.staffName, r.checkIn, r.checkOut])).toEqual([['Varun', '08:18 AM', '--'], ['Larissa', '09:13 AM', '05:40 PM'], ['Veerwati', '10:02 AM', '--']]);
        expect(rows[0]).toMatchObject({ date: '14-Oct', dateISO: '2026-10-14', source: 'face-scan', readOnly: true, status: 'Present', id: 'face-SKY5-004-2026-10-14' });
        expect(boardToRows(null)).toEqual([]);
    });
    test('present count: each person once, whether they used the phone, the terminal or both', () => {
        const logs = mergeLogs([{ staffName: 'Varun', date: '14-Oct', status: 'Present', checkIn: '08:20 AM' }, { staffName: 'Karan', date: '14-Oct', status: 'Pending', checkIn: '--' }], boardToRows(board, [], at));
        expect([...presentNames(logs, '14-Oct')].sort()).toEqual(['Larissa', 'Varun', 'Veervati']);
    });
});
