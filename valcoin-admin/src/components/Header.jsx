import React from 'react';
import { Coins, User, KeyRound } from 'lucide-react';

const Header = ({ onLogout, openChangePasswordModal }) => (
  <header className="bg-white shadow-sm border-b">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Coins className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">ValCoin Admin</h1>
          </div>
          <div className="hidden md:block">
            <span className="text-sm text-gray-500">Agrupamento de Escolas de Valpaços</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Admin</span>
          </div>
          <button onClick={openChangePasswordModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 text-sm flex items-center">
            <KeyRound className="w-4 h-4 mr-2" />
            Alterar Senha
          </button>
          <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
            Sair
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default Header;
