// src/components/Layout/MemoriaLayout.js

import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Brain, PlusCircle, List, LogOut, Menu, X, PieChart } from 'lucide-react';

const MemoriaLayout = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isProfessor = user?.tipo_utilizador === 'PROFESSOR';
  const isAluno = user?.tipo_utilizador === 'ALUNO';

  const handleLogout = () => {
    if (onLogout) onLogout();
    localStorage.removeItem('accessToken');
    window.location.href = 'http://localhost:3000/login';
  };

  const professorLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: Brain, tab: null }, // Existing dashboard
    { path: '/analytics', label: 'Analíticas', icon: PieChart, tab: null }, // New Analytics Dashboard link
    { path: '/create', label: 'Criar Flashcard', icon: PlusCircle, tab: 'create' },
    { path: '/manage', label: 'Gerir Flashcards', icon: List, tab: 'manage' },
  ];

  const alunoLinks = [
    { path: '/practice', label: 'Revisão Diária', icon: Brain, tab: null },
    { path: '/stats', label: 'Estatísticas', icon: List, tab: null },
  ];

  const links = isProfessor ? professorLinks : alunoLinks;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const isLinkActive = (link) => {
    const currentPath = location.pathname;
    const currentTab = new URLSearchParams(location.search).get('tab');
    
    if (link.tab) {
      return currentPath === '/dashboard' && currentTab === link.tab;
    }
    return currentPath === link.path;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex">
      {/* Sidebar - Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo / Header Sidebar */}
          <div className="p-8 border-b border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Memória
                </h1>
                <p className="text-sm text-gray-600">Repetição Espaçada</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="px-8 py-6 border-b border-gray-100">
            <p className="text-sm text-gray-600">Bem-vindo(a),</p>
            <p className="font-semibold text-lg text-indigo-800 truncate">
              {user?.nome || user?.numero_mecanografico}
            </p>
            <p className="text-sm text-purple-600 capitalize">
              {user?.tipo_utilizador === 'PROFESSOR' ? 'Professor' : 'Aluno'}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-8 overflow-y-auto">
            <ul className="space-y-3">
              {links.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-xl transition-all ${
                      isLinkActive(link)
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-indigo-100 hover:text-indigo-800'
                    }`}
                  >
                    <link.icon className="w-6 h-6" />
                    <span className="font-medium text-lg">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition font-medium"
            >
              <LogOut className="w-6 h-6" />
              Terminar Sessão
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar (mobile menu + title) */}
        <header className="bg-white shadow-md px-6 py-4 flex items-center justify-between lg:hidden">
          <button
            onClick={toggleSidebar}
            className="p-3 rounded-lg hover:bg-gray-100 transition"
          >
            {sidebarOpen ? <X className="w-8 h-8 text-indigo-600" /> : <Menu className="w-8 h-8 text-indigo-600" />}
          </button>
          <h2 className="text-2xl font-bold text-indigo-800">Memória</h2>
          <div className="w-12" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MemoriaLayout;
