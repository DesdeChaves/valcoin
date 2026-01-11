import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { Coins, X } from 'lucide-react'; // Using lucide-react for consistency

const StoreSidebar = ({ activeTab, setActiveTab, isSidebarOpen, setSidebarOpen }) => { // Add isSidebarOpen, setSidebarOpen
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon, path: '/' },
    { id: 'sell', label: 'Vender', icon: PlusCircleIcon, path: '/sell' },
    { id: 'validate-tickets', label: 'Validar Bilhetes', icon: QrCodeIcon, path: '/validate-tickets' },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <div
        className={`w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col fixed md:relative z-30 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 text-2xl font-bold text-white flex items-center justify-between">
          <Coins className="w-8 h-8" />
          <span>Loja Aurora</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-indigo-100 hover:text-white">
            <X size={24} />
          </button>
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
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (window.innerWidth < 768) { // md breakpoint
                      setSidebarOpen(false);
                    }
                  }}
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
    </>
  );
};

export default StoreSidebar;