import { useState } from 'react';
import ShopView from './components/ShopView';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [view, setView] = useState('shop'); // default to shop

  return (
    <>
      {view === 'shop' ? (
        <ShopView onNavigate={setView} />
      ) : (
        <AdminDashboard onNavigate={setView} />
      )}
    </>
  );
}

export default App;
