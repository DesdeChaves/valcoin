import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Folder, List, Settings, Hash, GraduationCap } from 'lucide-react'; // Using lucide-react for consistency

const FeedbackSidebar = ({ activeTab, setActiveTab, userType }) => {
  const professorTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'dossiers', label: 'Dossiês', icon: Folder, path: '/dossiers' },
    { id: 'criteria', label: 'Critérios', icon: List, path: '/criteria' },
    { id: 'instruments', label: 'Instrumentos', icon: Settings, path: '/instruments' },
    { id: 'counters', label: 'Contadores', icon: Hash, path: '/counters' },
  ];

  const studentTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'disciplines', label: 'Disciplinas', icon: BookOpen, path: '/discipline' }, // Generic path for now
    { id: 'counters', label: 'Contadores', icon: Hash, path: '/counters' },
  ];

  const tabsToRender = userType === 'PROFESSOR' ? professorTabs : studentTabs;

  return (
    <div className="w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col">
      <div className="p-4 text-2xl font-bold text-white flex items-center space-x-2">
        <BookOpen className="w-8 h-8" />
        <span>Feedback</span>
      </div>
      <nav className="mt-6 flex-1">
        <ul>
          {tabsToRender.map((tab) => (
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
        {/* Placeholder for other footer elements if needed */}
      </div>
    </div>
  );
};

export default FeedbackSidebar;