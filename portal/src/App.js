import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import IndicadoresPublicosPage from './pages/IndicadoresPublicosPage';
import RegisterPage from './pages/RegisterPage'; // Import new page
import { Menu, LogOut, DollarSign, Store, BookOpen, Settings, User, ArrowRight, Check, BarChart, UserPlus } from 'lucide-react';


// ============================================
// CONFIGURAÇÃO DA API - ADICIONE AQUI!
// ============================================
const API_CONFIG = {
  baseURL: typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : '',
  
  getUrl(endpoint) {
    return `${this.baseURL}${endpoint}`;
  }
};

const getAllowExternalRegistrationSetting = async () => {
  try {
    // Change this URL to the new public endpoint
    const response = await fetch(API_CONFIG.getUrl('/api/public/settings/external-registration')); 
    if (!response.ok) {
      throw new Error('Failed to fetch external registration setting');
    }
    const settings = await response.json(); // This will now directly return { allow_external_registration: true/false }
    const isAllowed = settings.allow_external_registration === true; // No need for 'true' string check
    return isAllowed;
  } catch (error) {
    console.error('Error fetching allow_external_registration setting:', error);
    return false; // Default to false if there's an error
  }
};

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
  const [allowExternalRegistration, setAllowExternalRegistration] = useState(false);

  useEffect(() => {
    const fetchSetting = async () => {
      const isAllowed = await getAllowExternalRegistrationSetting();
      setAllowExternalRegistration(isAllowed);
    };
    fetchSetting();
  }, []);
  const apps = [
    {
      id: 'admin',
      name: 'Aurora Admin',
      description: 'Gestão financeira e administrativa completa',
      icon: DollarSign,
      gradient: 'from-blue-600 to-blue-700',
      hoverGradient: 'from-blue-700 to-blue-800',
      path: '/admin',
      features: ['Dashboard em tempo real', 'Relatórios avançados', 'Gestão de utilizadores']
    },
    {
      id: 'store',
      name: 'Aurora Store',
      description: 'Plataforma de produtos e serviços',
      icon: Store,
      gradient: 'from-emerald-600 to-emerald-700',
      hoverGradient: 'from-emerald-700 to-emerald-800',
      path: '/store',
      features: ['Catálogo digital', 'Gestão de inventário', 'Sistema de pagamentos']
    },
    {
      id: 'feedback',
      name: 'Aurora Feedback',
      description: 'Sistema de avaliação académica',
      icon: BookOpen,
      gradient: 'from-purple-600 to-purple-700',
      hoverGradient: 'from-purple-700 to-purple-800',
      path: '/feedback',
      features: ['Avaliações detalhadas', 'Analytics de performance', 'Feedback contínuo']
    },
    {
      id: 'qualidade',
      name: 'Gestão da Qualidade',
      description: 'Gerencie processos e métricas de qualidade',
      icon: Settings, // Using Settings icon as planned
      gradient: 'from-orange-500 to-orange-600', // Orange tones
      hoverGradient: 'from-orange-600 to-orange-700',
      path: '/qualidade',
      features: ['Controlo de processos', 'Auditorias internas', 'Indicadores de desempenho']
    },
    {
      id: 'memoria',
      name: 'Memoria',
      description: 'Sistema de recordação espaçada para estudo',
      icon: BookOpen,
      gradient: 'from-cyan-500 to-cyan-600',
      hoverGradient: 'from-cyan-600 to-cyan-700',
      path: '/memoria',
      features: ['Flashcards personalizáveis', 'Algoritmo de repetição inteligente', 'Acompanhamento de progresso']
    }
  ];

  const responsibilityBadges = (
    <div className="flex items-center gap-2">
      <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">Respeito</span>
      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">Resiliência</span>
      <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full">Aspiração</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg width="180" height="45" viewBox="0 0 180 45" className="transition-all hover:scale-105 duration-300">
              <defs>
                <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e40af">
                    <animate attributeName="stop-color" values="#1e40af;#3b82f6;#1e40af" dur="4s" repeatCount="indefinite"/>
                  </stop>
                  <stop offset="50%" stopColor="#7c3aed">
                    <animate attributeName="stop-color" values="#7c3aed;#a855f7;#7c3aed" dur="4s" repeatCount="indefinite"/>
                  </stop>
                  <stop offset="100%" stopColor="#be185d">
                    <animate attributeName="stop-color" values="#be185d;#ec4899;#be185d" dur="4s" repeatCount="indefinite"/>
                  </stop>
                </linearGradient>
                
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* AURORA text */}
              <text x="5" y="30" 
                    fontFamily="system-ui, -apple-system, sans-serif" 
                    fontSize="32" 
                    fontWeight="800" 
                    fill="url(#textGrad)"
                    letterSpacing="1"
                    filter="url(#glow)">
                AURORA
              </text>
              
              {/* Underline wave */}
              <path d="M 5 35 Q 30 38, 55 35 T 105 35 T 155 35" 
                    stroke="url(#textGrad)" 
                    strokeWidth="2" 
                    fill="none"
                    strokeLinecap="round"
                    opacity="0.6">
                <animate attributeName="d" 
                         values="M 5 35 Q 30 38, 55 35 T 105 35 T 155 35;
                                 M 5 35 Q 30 32, 55 35 T 105 35 T 155 35;
                                 M 5 35 Q 30 38, 55 35 T 105 35 T 155 35"
                         dur="3s" 
                         repeatCount="indefinite"/>
              </path>
              
              {/* Subtitle */}
              <text x="7" y="43" 
                    fontFamily="system-ui, -apple-system, sans-serif" 
                    fontSize="7" 
                    fontWeight="600" 
                    fill="#64748b"
                    letterSpacing="2">
                EDUCATIONAL PLATFORM
              </text>
            </svg>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/indicadores" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2">
              <BarChart size={16} />
              Indicadores Públicos
            </Link>
            {allowExternalRegistration && (
              <Link to="/register" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-2">
                <UserPlus size={16} />
                Registar
              </Link>
            )}
            <div className="hidden md:flex items-center gap-2"> {/* Hide badges on small screens in header */}
              {responsibilityBadges}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-6">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-blue-700">Plataforma Integrada</span>
          </div>

          {/* Show badges here on small screens, hide on medium/large screens */}
          <div className="mb-6 flex items-center justify-center gap-2 md:hidden">
            {responsibilityBadges}
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
            Educação que
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Transforma</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Aceda às ferramentas que potenciam o sucesso educativo com uma única autenticação
          </p>
        </div>

        {/* Apps Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {apps.map((app, index) => {
            const Icon = app.icon;
            return (
              <div
                key={app.id}
                className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200/60"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${app.hoverGradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                <div className="relative p-8 flex flex-col h-full">
                  {/* Icon */}
                  <div className={`w-14 h-14 bg-gradient-to-br ${app.gradient} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{app.name}</h3>
                    <p className="text-slate-600 mb-6 leading-relaxed">{app.description}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-8">
                    {app.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  <div className="mt-auto">
                    {app.isInternal ? (
                      <Link
                        to={app.path}
                        className={`w-full bg-gradient-to-r ${app.gradient} hover:${app.hoverGradient} text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn`}
                      >
                        <span>Aceder à Página</span>
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => onSelectApp(app)}
                        className={`w-full bg-gradient-to-r ${app.gradient} hover:${app.hoverGradient} text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn`}
                      >
                        <span>Aceder à Plataforma</span>
                        <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-sm text-slate-500">
            © 2025 Aurora Educational Platform. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

// Página de Login Universal (SSO)
const LoginPage = ({ app, onLogin, onBack }) => {
  const [credentials, setCredentials] = useState({ identifier: '', password: '' }); // Changed from numero_mecanografico
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_CONFIG.getUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: credentials.identifier, // Changed from numero_mecanografico
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Credenciais inválidas ou erro no servidor');
      }

      const { accessToken, user } = await response.json();
      AuthService.setAuth(accessToken, user);
      onLogin(user);
      // Redirect to the selected application after successful login
      window.location.href = app.path;

    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || err.message || 'Credenciais inválidas ou erro no servidor.');
      setLoading(false);
    }
  };

  const Icon = app.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Voltar</span>
        </button>
        
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden">
          {/* Header com gradient */}
          <div className={`bg-gradient-to-br ${app.gradient} p-8 text-white`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{app.name}</h2>
                <p className="text-white/80 text-sm">Single Sign-On</p>
              </div>
            </div>
            <p className="text-white/90">Entre com as suas credenciais Aurora</p>
          </div>

          {/* Form */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Número Mecanográfico ou Email
              </label>
              <input
                type="text"
                value={credentials.identifier} // Changed from numero_mecanografico
                onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })} // Changed field name
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                placeholder="123456 ou o-seu-email@example.com" // Updated placeholder
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${app.gradient} text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>A autenticar...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="text-center pt-4">
              <a href="#" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                Esqueceu a password?
              </a>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Conexão segura e encriptada
          </p>
        </div>
      </div>
    </div>
  );
};

// Menu de Navegação entre Apps (App Switcher)
const AppSwitcher = ({ currentApp, user, onSwitchApp, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const apps = [
    { id: 'portal', name: 'Portal', icon: Menu, color: 'text-gray-500', path: '/' },
    { id: 'admin', name: 'Aurora Admin', icon: DollarSign, color: 'text-blue-500', path: '/admin' },
    { id: 'store', name: 'Aurora Store', icon: Store, color: 'text-green-500', path: '/store' },
    { id: 'feedback', name: 'Aurora Feedback', icon: BookOpen, color: 'text-purple-500', path: '/feedback' },
    { id: 'qualidade', name: 'Gestão da Qualidade', icon: Settings, color: 'text-orange-500', path: '/qualidade' }, // Added Qualidade
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/60"
      >
        <Menu className="w-5 h-5 text-slate-600" />
        <span className="font-semibold text-slate-900 hidden md:block">{currentAppName}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-slate-200/60">
            {/* User Profile */}
            <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-200/60">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{user.nome}</p>
                  <p className="text-sm text-slate-600">{user.tipo_utilizador}</p>
                </div>
              </div>
            </div>

            {/* Apps List */}
            <div className="p-3">
              <p className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Aplicações
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
                      onSwitchApp(app);
                      window.location.href = app.path; // Redireciona para a aplicação selecionada
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-blue-50 shadow-sm' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${app.gradient} rounded-lg flex items-center justify-center shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`font-semibold ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
                      {app.name}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Logout */}
            <div className="border-t border-slate-200/60 p-3">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-11 h-11 bg-gradient-to-br ${app.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{app.name}</h1>
              <p className="text-xs text-slate-500">Sessão ativa</p>
            </div>
          </div>

          <AppSwitcher 
            currentApp={app}
            user={user}
            onSwitchApp={onSwitchApp}
            onLogout={onLogout}
          />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl shadow-xl border border-slate-200/60 p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Bem-vindo, {user.nome}!
              </h2>
              <p className="text-slate-600">
                Está a usar o <span className="font-semibold text-slate-900">{app.name}</span>
              </p>
            </div>
            <div className={`w-16 h-16 bg-gradient-to-br ${app.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
              <Icon className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-blue-900 font-bold mb-1">Single Sign-On Ativo</p>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Pode alternar entre todas as aplicações Aurora sem necessidade de autenticação adicional. 
                  Use o menu no canto superior direito para navegar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-2 text-lg">Dashboard</h3>
            <p className="text-sm text-slate-600 leading-relaxed">Visão geral completa do sistema em tempo real</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900 mb-2 text-lg">Relatórios</h3>
            <p className="text-sm text-slate-600 leading-relaxed">Análise detalhada de dados e métricas</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-lg transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2 text-lg">Configurações</h3>
            <p className="text-sm text-slate-600 leading-relaxed">Personalize as preferências do sistema</p>
          </div>
        </div>
      </main>
    </div>
  );
};

// Aplicação Principal
const MainPage = () => {
  const [view, setView] = useState('landing');
  const [selectedApp, setSelectedApp] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (AuthService.isAuthenticated()) {
      const auth = AuthService.getAuth();
      setUser(auth.user);
    }
  }, []);

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    
    if (AuthService.isAuthenticated()) {
      // Já está autenticado - redireciona direto para a app
      window.location.href = app.path;
    } else {
      // Não está autenticado - mostra login
      setView('login');
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    // Redirecionamento será feito pelo handleLogin do LoginPage
  };

  const handleSwitchApp = (app) => {
    setSelectedApp(app);
  };

  const handleLogout = () => {
    AuthService.clearAuth();
    setUser(null);
    setView('landing');
    setSelectedApp(null);
    window.location.href = '/'; // Redireciona para a landing page após logout
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

// The new main App component that handles routing
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/indicadores" element={<IndicadoresPublicosPage />} />
      <Route path="/register" element={<RegisterPage />} /> {/* New route */}
    </Routes>
  );
}
