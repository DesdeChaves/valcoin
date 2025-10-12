import React from 'react';
import { Home, Users, BarChart2, BookOpen, Settings, DollarSign } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, tabs }) => (
  <div className="w-64 mr-8">
    <nav className="space-y-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
);

export default Sidebar;