import React, { useState, useEffect } from 'react';
import { Menu, LogOut, DollarSign, Store, BookOpen, Settings, User } from 'lucide-react';
import axios from 'axios'; // Import axios

// Simula o estado de autenticação global
const AuthService = {
  token: null,
  user: null,
  
  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  getAuth() {
    if (!this.token) {
      this.token = localStorage.getItem('authToken');
      const userStr = localStorage.getItem('user');
      this.user = userStr ? JSON.parse(userStr) : null;
    }
    return { token: this.token, user: this.user };
  },
  
  clearAuth() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },
  
  isAuthenticated() {
    return !!this.getAuth().token;
  }
};

// Página Inicial - Escolha de Aplicação
const LandingPage = ({ onSelectApp }) => {
  const apps = [
    {
      id: 'valcoin',
      name: 'ValCoin Admin',
      description: 'Gestão financeira e administrativa',
      icon: DollarSign,
      color: 'bg-blue-500',
      path: '/admin'
    },
    {
      id: 'store',
      name: 'ValCoin Store',
      description: 'Loja de produtos e serviços',
      icon: Store,
      color: 'bg-green-500',
      path: '/store'
    },
    {
      id: 'feedback',
      name: 'Sistema de Avaliação',
      description: 'Avaliações e feedback académico',
      icon: BookOpen,
      color: 'bg-purple-500',
      path: '/feedback'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">ValCoin Platform</h1>
          <p className="text-xl text-gray-600">Escolha a aplicação que deseja usar</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => onSelectApp(app)}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left"
              >
                <div className={`${app.color} w-16 h-16 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{app.name}</h2>
                <p className="text-gray-600">{app.description}</p>
                <div className="mt-6 text-indigo-600 font-semibold flex items-center">
                  Aceder →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Página de Login Universal (SSO)
const LoginPage = ({ app, onLogin, onBack }) => {
  const [credentials, setCredentials] = useState({ numero_mecanografico: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:3001/api/login', {
        numero_mecanografico: credentials.numero_mecanografico,
        password: credentials.password,
      });

      const { accessToken, user } = response.data;
      AuthService.setAuth(accessToken, user);
      onLogin(user); // Update local state
      window.location.href = app.path; // Redirect to the selected application
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || 'Credenciais inválidas ou erro no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const Icon = app.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onBack}
          className="mb-6 text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          ← Voltar
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className={`${app.color} w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">{app.name}</h2>
            <p className="text-gray-600 mt-2">Faça login para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número Mecanográfico
              </label>
              <input
                type="text"
                value={credentials.numero_mecanografico}
                onChange={(e) => setCredentials({ ...credentials, numero_mecanografico: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="123456"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${app.color} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'A entrar...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Menu de Navegação entre Apps (App Switcher)
const AppSwitcher = ({ currentApp, user, onSwitchApp, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const apps = [
    { id: 'valcoin', name: 'ValCoin Admin', icon: DollarSign, color: 'text-blue-500', path: '/admin' },
    { id: 'store', name: 'ValCoin Store', icon: Store, color: 'text-green-500', path: '/store' },
    { id: 'feedback', name: 'Sistema Avaliação', icon: BookOpen, color: 'text-purple-500', path: '/feedback' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
      >
        <Menu className="w-5 h-5" />
        <span className="font-semibold hidden md:block">{currentApp.name}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
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
                const Icon = app.icon;
                const isActive = app.id === currentApp.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      onSwitchApp(app);
                      window.location.href = app.path; // Redirect to the selected application
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

// Aplicação Exemplo
const AppView = ({ app, user, onSwitchApp, onLogout }) => {
  const Icon = app.icon;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`${app.color} w-10 h-10 rounded-lg flex items-center justify-center`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">{app.name}</h1>
          </div>

          <AppSwitcher 
            currentApp={app}
            user={user}
            onSwitchApp={onSwitchApp}
            onLogout={onLogout}
          />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Bem-vindo, {user.nome}!
          </h2>
          <p className="text-gray-600 mb-6">
            Está a usar o <span className="font-semibold">{app.name}</span>.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium mb-2">✨ Single Sign-On Ativo</p>
            <p className="text-blue-600 text-sm">
              Pode mudar entre aplicações sem fazer logout. 
              Use o menu no canto superior direito para alternar entre ValCoin Admin, Store e Sistema de Avaliação.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Dashboard</h3>
              <p className="text-sm text-gray-600">Visão geral do sistema</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Relatórios</h3>
              <p className="text-sm text-gray-600">Análise de dados</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Configurações</h3>
              <p className="text-sm text-gray-600">Preferências do sistema</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Aplicação Principal
export default function ValCoinSSO() {
  const [view, setView] = useState('landing'); // 'landing', 'login', 'app'
  const [selectedApp, setSelectedApp] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Verifica se já está autenticado
    if (AuthService.isAuthenticated()) {
      const auth = AuthService.getAuth();
      setUser(auth.user);
      // Poderia redirecionar para a última app usada
    }
  }, []);

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    
    if (AuthService.isAuthenticated()) {
      // Já está autenticado - vai direto para a app
      window.location.href = app.path; // Redirect to the selected application
    } else {
      // Não está autenticado - mostra login
      setView('login');
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    // No need to set view to 'app' here, as window.location.href will handle redirection
  };

  const handleSwitchApp = (app) => {
    setSelectedApp(app);
    // Não precisa fazer login novamente - SSO ativo!
  };

  const handleLogout = () => {
    AuthService.clearAuth();
    setUser(null);
    setView('landing');
    setSelectedApp(null);
    window.location.href = '/'; // Redirect to landing page after logout
  };

  const handleBack = () => {
    setView('landing');
  };

  if (view === 'landing') {
    return <LandingPage onSelectApp={handleSelectApp} />;
  }

  if (view === 'login') {
    return (
      <LoginPage 
        app={selectedApp} 
        onLogin={handleLogin}
        onBack={handleBack}
      />
    );
  }

  if (view === 'app') {
    // This view will only be reached if the user is already authenticated and
    // navigates back to the portal, or if the initial redirection fails for some reason.
    // For direct login, window.location.href will prevent this from rendering.
    return (
      <AppView 
        app={selectedApp}
        user={user}
        onSwitchApp={handleSwitchApp}
        onLogout={handleLogout}
      />
    );
  }

  return null;
}
