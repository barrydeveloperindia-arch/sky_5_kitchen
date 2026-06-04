import { useState, useEffect } from 'react';
import ShopView from './components/ShopView';
import AdminDashboard from './components/AdminDashboard';
import { combos } from './data/combos';
import { rooms as initialRooms } from './data/rooms';

function App() {
  const [view, setView] = useState('shop'); // default to shop
  
  // Initialize combos with an isActive property
  const [menuItems, setMenuItems] = useState(() => {
      return combos.map(c => ({ ...c, isActive: true }));
  });

  // Synchronize combos changes with state to ensure HMR updates new items/prices
  useEffect(() => {
      setMenuItems(prev => {
          return combos.map(c => {
              const prevItem = prev.find(p => p.id === c.id);
              return {
                  ...c,
                  isActive: prevItem ? prevItem.isActive : true
              };
          });
      });
  }, [combos]);

  const [roomList, setRoomList] = useState(initialRooms);

  // Global orders state
  const [orders, setOrders] = useState([
      { id: 'ORD-8241', table: 'Table 2', items: '2x Aloo Paratha, 1x Tea', status: 'Pending', time: '12:45 PM' },
      { id: 'ORD-9102', table: 'Room 105', items: '1x Special Thali', status: 'Preparing', time: '1:10 PM' }
  ]);

  const handlePlaceOrder = (newOrder, totalAmount) => {
      setOrders(prev => [newOrder, ...prev]);

      // If this is a room charge, add it to the room's food bill
      const tableStr = (newOrder.table || '').toLowerCase();
      if (tableStr.includes('room')) {
          // Extract the numbers from "Room 101"
          const match = tableStr.match(/\d+/);
          if (match) {
              const roomId = parseInt(match[0]);
              setRoomList(prevRooms => prevRooms.map(r => {
                  if (r.id === roomId) {
                      const currentFoodBill = r.foodBill || 0;
                      return { ...r, foodBill: currentFoodBill + totalAmount };
                  }
                  return r;
              }));
          }
      }
  };

  return (
    <>
      {view === 'shop' ? (
        <ShopView 
          onNavigate={setView} 
          menuItems={menuItems.filter(item => item.isActive)} 
          onPlaceOrder={handlePlaceOrder} 
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
        />
      )}
    </>
  );
}

export default App;
