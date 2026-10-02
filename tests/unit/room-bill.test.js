import { describe, test, expect } from 'vitest';
import {
    toDateTimeInput, parseStayDate, countNights, computeRoomBill, roomFolio, checkoutFolio, toLocalDateTime, inr, ROOM_GST_RATE, GST_RATE,
} from '../../02_Application_Source/lib/billing';

describe('parseStayDate', () => {
    test('datetime-local input value', () => {
        const d = parseStayDate('2026-09-29T10:00');
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 29, 10]);
    });

    test('seeded "28-Apr-2026, 11:30 AM" format', () => {
        const d = parseStayDate('28-Apr-2026, 11:30 AM');
        expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 3, 28, 11, 30]);
    });

    test('en-GB "29 Sept 2026, 04:15 PM" format', () => {
        const d = parseStayDate('29 Sept 2026, 04:15 PM');
        expect([d.getMonth(), d.getDate(), d.getHours()]).toEqual([8, 29, 16]);
    });

    test('12 AM / 12 PM edge cases', () => {
        expect(parseStayDate('01-Jan-2026, 12:05 AM').getHours()).toBe(0);
        expect(parseStayDate('01-Jan-2026, 12:05 PM').getHours()).toBe(12);
    });

    test.each([null, '', 'tomorrow', '31-Foo-2026'])('%s -> null', (v) => {
        expect(parseStayDate(v)).toBeNull();
    });
});

describe('countNights', () => {
    test('3-night stay', () => {
        expect(countNights('2026-09-26T14:00', '2026-09-29T11:00')).toBe(3);
    });

    test('same-day check-out bills one night; unknown dates bill one night', () => {
        expect(countNights('2026-09-29T09:00', '2026-09-29T20:00')).toBe(1);
        expect(countNights(undefined, undefined)).toBe(1);
        expect(countNights('not a date', '')).toBe(1);
    });

    test('no check-out yet counts nights up to now', () => {
        expect(countNights('2026-09-26T14:00', '', new Date(2026, 8, 29, 10))).toBe(3);
        expect(countNights('2026-09-29T09:00', '', new Date(2026, 8, 29, 22))).toBe(1);
    });

    test('check-out before check-in never gives zero/negative nights', () => {
        expect(countNights('2026-09-29T09:00', '2026-09-27T09:00')).toBe(1);
    });

    test('mixed formats across a month boundary', () => {
        expect(countNights('28-Apr-2026, 11:30 AM', '2026-05-02T11:00')).toBe(4);
    });
});

describe('computeRoomBill', () => {
    test('room GST on rent, 5% on food (food stored pre-GST) — food taxed once only', () => {
        const b = computeRoomBill({ price: 1800, foodBill: 1000, checkIn: '2026-09-26T12:00', checkOut: '2026-09-29T11:00', advance: 2000 });
        expect(b.nights).toBe(3);
        expect(b.roomTotal).toBe(5400);
        expect(b.roomGst).toBe(Math.round(5400 * ROOM_GST_RATE));
        expect(b.foodGst).toBe(Math.round(1000 * GST_RATE)); // 50, not 1000*5% + 12% again
        expect(b.subtotal).toBe(6400);
        expect(b.grandTotal).toBe(6400 + b.roomGst + b.foodGst);
        expect(b.balance).toBe(b.grandTotal - 2000);
    });

    test('GST switched off -> no tax anywhere', () => {
        const b = computeRoomBill({ price: 1800, foodBill: 500, gstEnabled: false });
        expect(b.gst).toBe(0);
        expect(b.grandTotal).toBe(2300);
    });

    test('string inputs from form fields are handled', () => {
        const b = computeRoomBill({ price: '2500', foodBill: '', advance: '' });
        expect(b.subtotal).toBe(2500);
        expect(b.advance).toBe(0);
    });
});

describe('roomFolio', () => {
    test('reads guest fields from a stored room; gstEnabled defaults to on', () => {
        const room = { id: 5, price: 2500, foodBill: 200, guest: { name: 'X', checkIn: '28-Apr-2026, 11:30 AM', advance: 500 } };
        const f = roomFolio(room, new Date(2026, 3, 28, 20, 0)); // same evening -> 1 night
        expect(f.nights).toBe(1);
        expect(f.gst).toBe(Math.round(2500 * ROOM_GST_RATE) + Math.round(200 * GST_RATE));
        expect(f.balance).toBe(2700 + f.gst - 500);
    });

    test('guest still in the room is billed for the nights so far (not 1 night)', () => {
        const room = { id: 5, price: 2500, guest: { name: 'X', checkIn: '28-Apr-2026, 11:30 AM' } };
        const f = roomFolio(room, new Date(2026, 4, 1, 9, 0)); // 1 May morning
        expect(f.nights).toBe(3);
        expect(f.roomTotal).toBe(7500);
    });

    test('explicit gstEnabled:false on guest is respected (receipt used to ignore it)', () => {
        const f = roomFolio({ price: 1800, guest: { gstEnabled: false } });
        expect(f.grandTotal).toBe(1800);
    });
});

describe('toDateTimeInput', () => {
    test('converts seeded and ISO dates for <input type="datetime-local">', () => {
        expect(toDateTimeInput('28-Apr-2026, 11:30 AM')).toBe('2026-04-28T11:30');
        expect(toDateTimeInput('2026-09-29T10:05')).toBe('2026-09-29T10:05');
        expect(toDateTimeInput('')).toBe('');
        expect(toDateTimeInput('rubbish')).toBe('');
    });
});

describe('QA night 1 fixes', () => {
    test('overpaid advance = refund, never a negative "balance due"', () => {
        const f = computeRoomBill({ price: 1200, checkIn: '2026-10-01T12:00', checkOut: '2026-10-02T11:00', advance: 2000 });
        expect(f.grandTotal).toBe(1344);
        expect(f.balance).toBe(-656);
        expect(f.due).toBe(0);
        expect(f.refund).toBe(656);
        const g = computeRoomBill({ price: 1800, checkIn: '2026-10-01T12:00', checkOut: '2026-10-03T11:00', foodBill: 388, advance: 1000 });
        expect([g.due, g.refund]).toEqual([3439, 0]);
    });
    test('checkout bills the actual departure, not the planned check-out', () => {
        const room = { price: 1800, foodBill: 0, guest: { checkIn: '2026-10-01T14:00', checkOut: '2026-10-05T11:00', advance: 0 } };
        expect(roomFolio(room, new Date(2026, 9, 2, 10, 0)).nights).toBe(4);          // planned stay
        const early = checkoutFolio(room, new Date(2026, 9, 2, 10, 0));                 // left on 2 Oct
        expect(early.nights).toBe(1);
        expect(early.grandTotal).toBe(1800 + Math.round(1800 * ROOM_GST_RATE));
        const late = checkoutFolio(room, new Date(2026, 9, 7, 10, 0));                  // overstayed to 7 Oct
        expect(late.nights).toBe(6);
    });
    test('toLocalDateTime is local time (no UTC shift)', () => {
        expect(toLocalDateTime(new Date(2026, 9, 1, 23, 45))).toBe('2026-10-01T23:45');
    });
    test('inr uses Indian grouping', () => {
        expect(inr(123456)).toBe('₹1,23,456');
        expect(inr(undefined)).toBe('₹0');
    });
});
