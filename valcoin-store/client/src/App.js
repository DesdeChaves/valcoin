import React from 'react';
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

function App() {
  const { user, token, login, logout } = useAuth();

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-primary text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold flex items-center space-x-2">
              <HomeIcon className="h-6 w-6" />
              <span>Loja ValCoin</span>
            </Link>
            {user && (
              <div className="flex space-x-6 items-center">
                <Link to="/" className="flex items-center space-x-1 hover:underline">
                  <HomeIcon className="h-5 w-5" />
                  <span>Home</span>
                </Link>
                <Link to="/sell" className="flex items-center space-x-1 hover:underline">
                  <PlusCircleIcon className="h-5 w-5" />
                  <span>Vender</span>
                </Link>
                {/* Validador acessível para todos os utilizadores */}
                <Link to="/validate-tickets" className="flex items-center space-x-1 hover:underline">
                  <QrCodeIcon className="h-5 w-5" />
                  <span>Validar Bilhetes</span>
                </Link>
                <button onClick={logout} className="flex items-center space-x-1 hover:underline">
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto p-6 flex-grow">
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <ProductList user={user} token={token} /> : <Navigate to="/login" />} />
            <Route path="/product/:id" element={user ? <ProductDetail user={user} token={token} /> : <Navigate to="/login" />} />
            <Route path="/sell" element={user ? <SellProductForm user={user} token={token} /> : <Navigate to="/login" />} />
            <Route path="/product/:id/edit" element={user ? <EditProductForm token={token} /> : <Navigate to="/login" />} />
            <Route path="/product/:id/purchases" element={user ? <ProductPurchases token={token} /> : <Navigate to="/login" />} />
            
            {/* Rota para validar bilhetes - acessível para todos */}
            <Route 
              path="/validate-tickets" 
              element={user ? <TicketValidator token={token} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-primary text-white p-4 text-center">
          <p className="text-sm">&copy; 2025 Loja ValCoin. Todos os direitos reservados.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
