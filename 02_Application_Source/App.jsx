import { useState, useMemo, useCallback } from 'react';
import ShopView from './components/ShopView';
import AdminDashboard from './components/AdminDashboard';
import StaffInventory from './components/StaffInventory';
import { combos } from './data/combos';
import { rooms as roomData, liveSeedRooms } from './data/rooms';
import { parseRoomNumber, addFoodBillToRoom } from './lib/billing';
import { IS_TEST_ENV } from './lib/firebase';
import { useSyncedCollection, useSyncedDoc } from './lib/syncedState';

// Staff get a direct link to /inventory (vercel.json rewrites every path to index.html)
const isStaffInventory = window.location.pathname.replace(/\/+$/, '') === '/inventory';

// Live data starts clean: every room free, no guests, no orders. The sample guests/orders
// exist only in the test environment (E2E fixtures), never in the live hotel data.
const SEED_ROOMS = IS_TEST_ENV ? roomData : liveSeedRooms();
const SEED_ORDERS = IS_TEST_ENV ? [
  { id: 'ORD-8241', table: 'Table 2', items: '2x Aloo Paratha, 1x Tea', status: 'Pending', time: '12:45 PM' },
  { id: 'ORD-9102', table: 'Room 105', items: '1x Special Thali', status: 'Preparing', time: '1:10 PM' },
] : [];

// Menu = combos.js + owner's changes from Menu Config (price / active), stored as overrides only
const menuFromOverrides = (ov) => combos.map(c => ({ ...c, isActive: true, ...(ov?.[c.id] || {}) }));
const overridesFromMenu = (items) => {
  const ov = {};
  for (const m of items) {
    const base = combos.find(c => c.id === m.id);
    if (base && (m.price !== base.price || m.isActive === false)) ov[m.id] = { price: m.price, isActive: m.isActive !== false };
  }
  return ov;
};

function HotelApp() {
  const [view, setView] = useState('shop'); // default to shop

  const [menuOverrides, setMenuOverrides] = useSyncedDoc('menuOverrides', {});
  const menuItems = useMemo(() => menuFromOverrides(menuOverrides), [menuOverrides]);
  const setMenuItems = useCallback((updater) => {
      setMenuOverrides(prevOv => {
          const current = menuFromOverrides(prevOv);
          const next = typeof updater === 'function' ? updater(current) : updater;
          return overridesFromMenu(next);
      });
  }, [setMenuOverrides]);

  const [roomList, setRoomList, roomsReady] = useSyncedCollection('hotel_rooms', SEED_ROOMS);
  const [orders, setOrders] = useSyncedCollection('hotel_orders', SEED_ORDERS, { newestFirst: true });

  const handlePlaceOrder = (newOrder, totalAmount) => {
      setOrders(prev => [newOrder, ...prev]);

      // Only "Room Charge" orders go on the room folio (pre-GST); UPI / Card / COD are already paid
      const roomId = newOrder.paymentMethod === 'Room Charge' ? parseRoomNumber(newOrder.table) : null;
      if (roomId !== null) {
          setRoomList(prevRooms => addFoodBillToRoom(prevRooms, roomId, totalAmount));
      }
  };

  return (
    <>
      {view === 'shop' ? (
        <ShopView
          onNavigate={setView}
          menuItems={menuItems.filter(item => item.isActive)}
          onPlaceOrder={handlePlaceOrder}
          liveRooms={roomList}
        />
      ) : (
        <AdminDashboard
          onNavigate={setView}
          orders={orders}
          setOrders={setOrders}
          menuItems={menuItems}
          setMenuItems={setMenuItems}
          rooms={roomList}
          setRooms={setRoomList}
          liveReady={roomsReady}
        />
      )}
    </>
  );
}

function App() {
  // .legacy keeps the existing screens on browser defaults (see styles/ui.css); new shadcn screens use .ui
  return <div className="legacy">{isStaffInventory ? <StaffInventory /> : <HotelApp />}</div>;
}

export default App;
