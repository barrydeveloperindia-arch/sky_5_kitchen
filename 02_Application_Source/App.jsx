import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import ShopView from './components/ShopView';
import AdminGate from './components/AdminGate';
// Guests only need the shop: the OPS Center and the staff pages are fetched when they are opened.
// A page left open across an update asks for old file names that are gone: reload once to get the new version.
const lazyScreen = (load) => lazy(() => load().catch((err) => {
  let reloaded = false;
  try { reloaded = sessionStorage.getItem('sky5_reloaded_for_update') === '1'; sessionStorage.setItem('sky5_reloaded_for_update', '1'); } catch { /* private mode */ }
  if (!reloaded) { window.location.reload(); return new Promise(() => {}); }
  throw err;
}).then((m) => { try { sessionStorage.removeItem('sky5_reloaded_for_update'); } catch { /* private mode */ } return m; }));
const AdminDashboard = lazyScreen(() => import('./components/AdminDashboard'));
const StaffInventory = lazyScreen(() => import('./components/StaffInventory'));
const StaffAttendance = lazyScreen(() => import('./components/StaffAttendance'));
const HotelTv = lazyScreen(() => import('./components/HotelTv'));
import { combos } from './data/combos';
import { rooms as roomData, liveSeedRooms } from './data/rooms';
import { parseRoomNumber, addFoodBillToRoom } from './lib/billing';
import { IS_TEST_ENV } from './lib/firebase';
import { useSyncedCollection, useSyncedDoc } from './lib/syncedState';

// Staff get a direct link to /inventory (vercel.json rewrites every path to index.html)
const staffPath = window.location.pathname.replace(/\/+$/, '');
const isStaffInventory = staffPath === '/inventory';
// Staff check-in / check-out on their own phone (share link: /attendance)
const isStaffAttendance = staffPath === '/attendance';
// Staff attendance board for the hotel TV (read only)
const isHotelTv = staffPath === '/tv';
// OPS Center admin login (admin@sky5.com). Switched on once the admin user exists in Firebase Authentication;
// a build with VITE_ADMIN_LOGIN=0 leaves the OPS Center open as before.
const ADMIN_LOGIN_ON = import.meta.env.VITE_ADMIN_LOGIN !== '0';

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
        <AdminGate enabled={ADMIN_LOGIN_ON} onCancel={() => setView('shop')}>
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
        </AdminGate>
      )}
    </>
  );
}

// Shown for a moment while a screen's code arrives
function Loading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: '#0a192f', fontWeight: 700, letterSpacing: '0.15em', fontSize: 12 }}>
      LOADING…
    </div>
  );
}

function App() {
  // .legacy keeps the existing screens on browser defaults (see styles/ui.css); new shadcn screens use .ui
  return (
    <div className="legacy">
      <Suspense fallback={<Loading />}>
        {isHotelTv ? <HotelTv /> : isStaffAttendance ? <StaffAttendance /> : isStaffInventory ? <StaffInventory /> : <HotelApp />}
      </Suspense>
    </div>
  );
}

export default App;
