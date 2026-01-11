import React from 'react';
import { Coins, User, KeyRound, Menu } from 'lucide-react';
import AppSwitcher from './AppSwitcher'; // Import AppSwitcher

const StoreHeader = ({ onLogout, currentUser, setSidebarOpen }) => ( // Add setSidebarOpen
  <header className="bg-indigo-600 shadow-sm border-b border-indigo-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
          >
            <Menu size={24} />
          </button>
          <div className="hidden md:flex items-center space-x-4 text-xl font-bold">
            <span className="bg-blue-500 text-white px-2 py-1 rounded">Respeito</span>
            <span className="bg-green-500 text-white px-2 py-1 rounded">Resiliência</span>
            <span className="bg-purple-500 text-white px-2 py-1 rounded">Aspiração</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <AppSwitcher currentApp="store" user={currentUser} onLogout={onLogout} />
          {/* Removed ChangePasswordModal button as it's not typically in the store app */}
        </div>
      </div>
    </div>
  </header>
);

export default StoreHeader;