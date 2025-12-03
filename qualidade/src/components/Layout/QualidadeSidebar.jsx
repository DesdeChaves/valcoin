import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileCog, Building } from 'lucide-react'; // Using lucide-react for consistency

const QualidadeSidebar = ({ activeTab, setActiveTab, userType, currentUser }) => {
  const professorTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'aplicacoes', label: 'Aplicações', icon: ClipboardList, path: '/aplicacoes' },
    { id: 'questionarios', label: 'Questionários', icon: FileCog, path: '/questionarios' },
    { id: 'empresas', label: 'Empresas', icon: Building, path: '/empresas' }, // New tab
  ];

  const studentTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'aplicacoes', label: 'Aplicações', icon: ClipboardList, path: '/aplicacoes' },
    // Add more student-specific tabs here
  ];

  const tabsToRender = (userType === 'PROFESSOR' || userType === 'ADMIN') ? professorTabs : studentTabs;

  return (
    <div className="w-64 h-screen bg-orange-800 text-orange-100 flex flex-col">
      <div className="p-4 text-2xl font-bold text-white flex items-center space-x-2">
        <span>Gestão da Qualidade</span>
      </div>
      <nav className="mt-6 flex-1">
        <ul>
          {tabsToRender.map((tab) => (
            <li key={tab.id}>
              <NavLink
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 transition-colors duration-200 ${
                    isActive ? 'bg-orange-700 text-white' : 'hover:bg-orange-700 text-orange-100'
                  }`
                }
                onClick={() => setActiveTab(tab.id)}
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

export default QualidadeSidebar;