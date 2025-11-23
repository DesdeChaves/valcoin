import React from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Folder, List, Settings, Hash, GraduationCap, Star } from 'lucide-react'; // Using lucide-react for consistency

const FeedbackSidebar = ({ activeTab, setActiveTab, userType, currentUser, departments }) => {
  const professorTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
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

  return (
    <div className="w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col">
      <div className="p-4 text-2xl font-bold text-white flex items-center space-x-2">
        <span>Aurora Feedback</span>
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