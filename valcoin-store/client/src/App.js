import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, ArrowRightOnRectangleIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import Login from './components/Login';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import SellProductForm from './components/SellProductForm';
import EditProductForm from './components/EditProductForm';
import ProductPurchases from './components/ProductPurchases';
import TicketValidator from './components/TicketValidator';
import useAuth from './useAuth';
import StoreSidebar from './components/StoreSidebar'; // Import StoreSidebar
import StoreHeader from './components/StoreHeader';   // Import StoreHeader

function App() {
  const { user, token, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('home'); // State for active sidebar tab

  if (!user) {
    return <Login onLogin={login} />;
  }

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="min-h-screen bg-gray-100 flex"> {/* Changed bg-gray-50 to bg-gray-100 for consistency */}
        <StoreSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <StoreHeader onLogout={logout} currentUser={user} />
          {/* Main Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
            <Routes>
              <Route path="/" element={<ProductList user={user} token={token} />} />
              <Route path="/product/:id" element={<ProductDetail user={user} token={token} />} />
              <Route path="/sell" element={<SellProductForm user={user} token={token} />} />
              <Route path="/product/:id/edit" element={<EditProductForm token={token} />} />
              <Route path="/product/:id/purchases" element={<ProductPurchases token={token} />} />
              <Route path="/validate-tickets" element={<TicketValidator token={token} />} />
              {/* Redirect any unmatched routes to home if authenticated */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="bg-indigo-600 text-white p-4 text-center shadow-inner"> {/* Changed bg-primary to bg-indigo-600 */}
            <p className="text-sm">&copy; 2025 Loja Aurora. Todos os direitos reservados.</p>
            <p className="text-xs mt-2">Respeito, Resiliência e Aspiração</p>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
