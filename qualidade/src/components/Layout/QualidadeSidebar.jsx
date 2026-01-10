import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, FileCog, Building, Gauge, X } from 'lucide-react';

const QualidadeSidebar = ({ activeTab, setActiveTab, userType, currentUser, isSidebarOpen, setSidebarOpen }) => {
  const professorTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'aplicacoes', label: 'Aplicações', icon: ClipboardList, path: '/aplicacoes' },
    { id: 'questionarios', label: 'Questionários', icon: FileCog, path: '/questionarios' },
    { id: 'empresas', label: 'Empresas', icon: Building, path: '/empresas' }, // New tab
  ];

  if (currentUser && currentUser.roles && (currentUser.roles.includes('coordenador_cursos_profissionais') || currentUser.roles.includes('responsavel_ciclo'))) {
    professorTabs.push({ id: 'eqavet', label: 'Qualidade EQAVET', icon: Gauge, path: '/eqavet' });
  }

  const studentTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'aplicacoes', label: 'Aplicações', icon: ClipboardList, path: '/aplicacoes' },
    // Add more student-specific tabs here
  ];

  const tabsToRender = (userType === 'PROFESSOR' || userType === 'ADMIN') ? professorTabs : studentTabs;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <div
        className={`w-64 h-screen bg-orange-800 text-orange-100 flex flex-col fixed md:relative z-30 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 text-2xl font-bold text-white flex items-center justify-between">
          <span>Gestão da Qualidade</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-orange-100 hover:text-white">
            <X size={24} />
          </button>
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
          {/* Placeholder for other footer elements if needed */}
        </div>
      </div>
    </>
  );
};

export default QualidadeSidebar;