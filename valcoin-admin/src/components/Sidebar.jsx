import React from 'react';
import { Home, Users, BarChart2, BookOpen, Settings, DollarSign, X } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, tabs, isSidebarOpen, setSidebarOpen }) => (
  <>
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
      onClick={() => setSidebarOpen(false)}
    ></div>
    <div
      className={`w-64 h-screen bg-white shadow-lg fixed md:relative z-30 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out`}
    >
      <div className="p-4 text-2xl font-bold text-gray-800 flex items-center justify-between">
        <span>Admin</span>
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-600 hover:text-gray-800">
          <X size={24} />
        </button>
      </div>
      <nav className="mt-6 space-y-2 flex-1 p-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (window.innerWidth < 768) { // md breakpoint
                  setSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  </>
);

export default Sidebar;