import React from 'react';
import { Coins, User, KeyRound, Menu } from 'lucide-react';
import AppSwitcher from '../AppSwitcher'; // Import AppSwitcher

const StudentHeader = ({ onLogout, openChangePasswordModal, currentUser, setSidebarOpen }) => (
  <header className="bg-indigo-600 shadow-sm border-b border-indigo-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-indigo-100 hover:text-white"
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
          <AppSwitcher currentApp="admin" user={currentUser} onLogout={onLogout} />
          <button onClick={openChangePasswordModal} className="bg-indigo-500 text-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm flex items-center transition-colors duration-200">
            <KeyRound className="w-4 h-4 mr-2" />
            Alterar Senha
          </button>
        </div>
      </div>
    </div>
  </header>
);

export default StudentHeader;