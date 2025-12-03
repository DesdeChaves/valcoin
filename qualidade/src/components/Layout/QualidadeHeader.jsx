import React from 'react';
import AppSwitcher from '../AppSwitcher'; // This will need to be created or copied

const QualidadeHeader = ({ onLogout, currentUser }) => (
  <header className="bg-orange-500 shadow-sm border-b border-orange-600">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
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