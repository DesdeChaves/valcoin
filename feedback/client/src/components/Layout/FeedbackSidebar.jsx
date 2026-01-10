import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Folder, List, Settings, Hash, GraduationCap, Star, Users, X } from 'lucide-react';

const FeedbackSidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab, userType, currentUser }) => {
  const professorTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'student-view', label: 'Visão do Aluno', icon: Users, path: '/student-view' },
    { id: 'dossiers', label: 'Dossiês', icon: Folder, path: '/dossiers' },
    { id: 'criteria', label: 'Critérios', icon: List, path: '/criteria' },
    { id: 'instruments', label: 'Instrumentos', icon: Settings, path: '/instruments' },
    { id: 'counters', label: 'Contadores', icon: Hash, path: '/counters' },
    { id: 'competencies', label: 'Competências', icon: GraduationCap, path: '/competencies' },
    { id: 'medidas', label: 'Medidas Educativas', icon: BookOpen, path: '/medidas' },
    { id: 'evaluate-crisucesso', label: 'Avaliar Crit. Sucesso', icon: Star, path: '/crisucessoFeedback-evaluation' },
    ...(currentUser && currentUser.isCoordinator ? [{ id: 'crisucessoFeedback', label: 'Crit. Sucesso (Coord.)', icon: Star, path: '/crisucessofeedback' }] : []),
  ];

  const studentTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'disciplines', label: 'Disciplinas', icon: BookOpen, path: '/disciplines' },
    { id: 'crisucesso', label: 'Critérios de Sucesso', icon: Star, path: '/crisucesso' },
    { id: 'competencies', label: 'Competências', icon: GraduationCap, path: '/competencies' },
    { id: 'counters', label: 'Contadores', icon: Hash, path: '/counters' },
  ];

  const tabsToRender = userType === 'PROFESSOR' ? professorTabs : studentTabs;

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-20 w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:relative md:translate-x-0
  `;

  return (
    <div className={sidebarClasses}>
      <div className="p-4 text-2xl font-bold text-white flex items-center justify-between">
        <span>Aurora Feedback</span>
        <button 
          onClick={() => setIsOpen(false)}
          className="md:hidden text-indigo-200 hover:text-white"
          aria-label="Close sidebar"
        >
          <X className="w-6 h-6" />
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
                    isActive ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-700 text-indigo-100'
                  }`
                }
                onClick={() => {
                  setActiveTab(tab.id);
                  if (window.innerWidth < 768) { // Close sidebar on mobile after navigation
                    setIsOpen(false);
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
  );
};

export default FeedbackSidebar;