import React, { useState } from 'react';
import { Menu, DollarSign, Store, BookOpen, User, LogOut, Settings as SettingsIcon } from 'lucide-react'; // Added SettingsIcon

const AppSwitcher = ({ currentApp, user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const apps = [
    { id: 'portal', name: 'Portal', icon: Menu, color: 'text-gray-500', path: '/' },
    { id: 'admin', name: 'Aurora Admin', icon: DollarSign, color: 'text-blue-500', path: '/admin' },
    { id: 'store', name: 'Aurora Store', icon: Store, color: 'text-green-500', path: '/store' },
    { id: 'feedback', name: 'Aurora Feedback', icon: BookOpen, color: 'text-purple-500', path: '/feedback' },
    { id: 'qualidade', name: 'Gestão da Qualidade', icon: SettingsIcon, color: 'text-orange-500', path: '/qualidade' }, // Added Qualidade
    { id: 'memoria', name: 'Memoria', icon: BookOpen, color: 'text-cyan-500', path: '/memoria' } // Added Memoria
  ];

  const handleSwitchApp = (app) => {
    // Special handling for EXTERNO users only allowed in Memoria and Portal
    if (user.tipo_utilizador === 'EXTERNO' && app.id !== 'memoria' && app.id !== 'portal') {
      // Optional: show a toast message or handle this more gracefully
      alert("Como utilizador externo, só pode aceder à aplicação Memoria e Portal.");
      return;
    }
    window.location.href = app.path;
  };

  const currentAppName = apps.find(app => app.id === currentApp)?.name || 'Current App';

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200"
      >
        <Menu className="w-5 h-5" />
        <span className="font-semibold hidden md:block">{currentAppName}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{user.nome}</p>
                  <p className="text-sm text-gray-600">{user.tipo_utilizador}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Mudar de Aplicação
              </p>
              {apps.map((app) => {
                // Filter apps for EXTERNO users
                if (user.tipo_utilizador === 'EXTERNO' && app.id !== 'memoria' && app.id !== 'portal') {
                  return null;
                }
                const Icon = app.icon;
                const isActive = app.id === currentApp;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      handleSwitchApp(app);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : app.color}`} />
                    <span className="font-medium">{app.name}</span>
                    {isActive && (
                      <span className="ml-auto text-xs bg-indigo-600 text-white px-2 py-1 rounded">
                        Atual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t p-2">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Terminar Sessão</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AppSwitcher;
