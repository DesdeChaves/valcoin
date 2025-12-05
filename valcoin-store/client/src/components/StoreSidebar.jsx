import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { Coins } from 'lucide-react'; // Using lucide-react for consistency

const StoreSidebar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon, path: '/' },
    { id: 'sell', label: 'Vender', icon: PlusCircleIcon, path: '/sell' },
    { id: 'validate-tickets', label: 'Validar Bilhetes', icon: QrCodeIcon, path: '/validate-tickets' },
  ];

  return (
    <div className="w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col">
      <div className="p-4 text-2xl font-bold text-white flex items-center space-x-2">
        <Coins className="w-8 h-8" />
        <span>Loja Aurora</span>
      </div>
      <nav className="mt-6 flex-1">
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 transition-colors duration-200 ${
                    isActive ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-700 text-indigo-100'
                  }`
                }
                onClick={() => setActiveTab(tab.id)} // Assuming activeTab state is managed in App.js
              >
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 space-y-2">
        {/* Placeholder for AppSwitcher or other footer elements if needed */}
      </div>
    </div>
  );
};

export default StoreSidebar;