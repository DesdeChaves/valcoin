import React from 'react';
import AppSwitcher from '../AppSwitcher'; // This will need to be created or copied
import { Menu } from 'lucide-react';

const QualidadeHeader = ({ onLogout, currentUser, setSidebarOpen }) => (
  <header className="bg-orange-500 shadow-sm border-b border-orange-600">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-orange-100 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <div className="hidden md:flex items-center space-x-4 text-xl font-bold">
            {/* You can add some branding here if you want */}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <AppSwitcher currentApp="qualidade" user={currentUser} onLogout={onLogout} />
        </div>
      </div>
    </div>
  </header>
);

export default QualidadeHeader;