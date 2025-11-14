import React from 'react';
import { Coins, User, KeyRound } from 'lucide-react';
import AppSwitcher from './AppSwitcher'; // Import AppSwitcher

const StoreHeader = ({ onLogout, currentUser }) => (
  <header className="bg-indigo-600 shadow-sm border-b border-indigo-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Coins className="w-8 h-8 text-white" />
            <h1 className="text-xl font-bold text-white">Loja ValCoin</h1>
          </div>
          <div className="hidden md:block">
            <span className="text-sm text-indigo-100">Agrupamento de Escolas de Valpaços</span>
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