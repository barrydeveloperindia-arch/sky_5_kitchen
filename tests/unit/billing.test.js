import { describe, test, expect } from 'vitest';
import {
    GST_RATE, resolveCartItem, loadCart, pruneCart, computeBill, parseRoomNumber, addFoodBillToRoom, ROOM_GST_RATE,
} from '../../02_Application_Source/lib/billing';
import { combos as realCombos } from "../../02_Application_Source/data/combos";
import { rooms as realRooms } from "../../02_Application_Source/data/rooms";

const menu = [
    { id: 1001, name: 'Aloo Paratha Combo', category: 'Breakfast', price: 169 },
    { id: 7001, name: 'Tea', category: 'Beverages', price: 50 },
];
const rooms = [
    { id: 5, type: 'Super Deluxe Room', price: 2500 },
];

describe('resolveCartItem', () => {
    test('finds a menu item by string id', () => {
        expect(resolveCartItem('1001', menu, rooms).name).toBe('Aloo Paratha Combo');
    });

    test('rooms get a printable name (room.type) so invoice/WhatsApp never say "undefined"', () => {
        const item = resolveCartItem('5', menu, rooms);
        expect(item.name).toBe('Super Deluxe Room');
        expect(item.category).toBe('Stays');
        expect(item.price).toBe(2500);
    });

    test('returns null for unknown ids', () => {
        expect(resolveCartItem('9999', menu, rooms)).toBeNull();
    });
});

describe('loadCart', () => {
    test('empty / missing storage gives an empty cart', () => {
        expect(loadCart(null)).toEqual({});
        expect(loadCart('')).toEqual({});
    });

    test('corrupt JSON does not throw', () => {
        expect(loadCart('{not json')).toEqual({});
        expect(loadCart('[1,2]')).toEqual({});
        expect(loadCart('null')).toEqual({});
    });

    test('drops zero, negative, fractional and non-numeric quantities', () => {
        expect(loadCart(JSON.stringify({ 1001: 2, 7001: 0, 5: -1, 6: 1.5, 7: 'x' }))).toEqual({ 1001: 2 });
    });
});

describe('pruneCart', () => {
    test('removes items that are no longer on the (active) menu', () => {
        expect(pruneCart({ 1001: 1, 3004: 2, 5: 1 }, menu, rooms)).toEqual({ 1001: 1, 5: 1 });
    });
});

describe('computeBill', () => {
    test('subtotal, 5% GST (rounded) and grand total', () => {
        const bill = computeBill({ 1001: 2, 7001: 1 }, menu, rooms);
        expect(bill.subtotal).toBe(169 * 2 + 50); // 388
        expect(bill.gst).toBe(Math.round(388 * GST_RATE)); // 19
        expect(bill.grandTotal).toBe(388 + 19);
        expect(bill.totalItems).toBe(3);
        expect(bill.items.map(i => i.quantity)).toEqual([2, 1]);
    });

    test('stale ids are ignored in count and totals (no phantom badge count)', () => {
        const bill = computeBill({ 1001: 1, 3004: 4 }, menu, rooms);
        expect(bill.totalItems).toBe(1);
        expect(bill.subtotal).toBe(169);
        expect(bill.items).toHaveLength(1);
    });

    test('empty cart is all zeros', () => {
        expect(computeBill({}, menu, rooms)).toEqual({ items: [], totalItems: 0, subtotal: 0, foodSubtotal: 0, staysSubtotal: 0, gst: 0, grandTotal: 0 });
    });

    test('GST rounds half up at .5', () => {
        // 10 * 0.05 = 0.5 -> 1
        expect(computeBill({ 1: 1 }, [{ id: 1, name: 'x', price: 10 }], []).gst).toBe(1);
    });
});

describe('parseRoomNumber', () => {
    test.each([
        ['Room 5', 5],
        ['room 12', 12],
        ['ROOM NO. 14', 14],
        ['Room-7', 7],
    ])('%s -> %i', (input, expected) => {
        expect(parseRoomNumber(input)).toBe(expected);
    });

    test.each(['Table 2', '', null, undefined, 'Room'])('%s -> null', (input) => {
        expect(parseRoomNumber(input)).toBeNull();
    });
});

describe('addFoodBillToRoom', () => {
    test('adds to the right room without mutating the input', () => {
        const input = [{ id: 5, foodBill: 100 }, { id: 7 }];
        const out = addFoodBillToRoom(input, 7, 407);
        expect(out[1].foodBill).toBe(407);
        expect(out[0]).toBe(input[0]);
        expect(input[1].foodBill).toBeUndefined();
        expect(addFoodBillToRoom(out, 7, 100)[1].foodBill).toBe(507);
    });

    test('unknown room leaves everything unchanged', () => {
        const input = [{ id: 5 }];
        expect(addFoodBillToRoom(input, 99, 100)).toEqual(input);
    });
});

test('parseRoomNumber: "Bathroom 3" / "Storeroom 2" are not rooms', () => {
    expect(parseRoomNumber('Bathroom 3')).toBeNull();
    expect(parseRoomNumber('Storeroom 2')).toBeNull();
    expect(parseRoomNumber('Room5')).toBe(5);
    expect(parseRoomNumber(12)).toBeNull();
});

test('a room booked from the shop carries the room GST rate, food stays 5%', () => {
    const roomId = realRooms[0].id;
    const food = realCombos[0];
    const bill = computeBill({ [food.id]: 2, [roomId]: 1 }, realCombos, realRooms);
    expect(bill.staysSubtotal).toBe(realRooms[0].price);
    expect(bill.foodSubtotal).toBe(food.price * 2);
    expect(bill.gst).toBe(Math.round(food.price * 2 * GST_RATE) + Math.round(realRooms[0].price * ROOM_GST_RATE));
});
