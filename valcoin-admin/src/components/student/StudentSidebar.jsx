// src/components/student/StudentSidebar.jsx
import React from 'react';
import { LayoutDashboard, ArrowRightLeft, LogOut, Zap, PiggyBank, Shield, KeyRound } from 'lucide-react';

const StudentSidebar = ({ activeTab, setActiveTab, handleLogout, openChangePasswordModal }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-house', label: 'A Minha House', icon: Shield },
    { id: 'manual-payment', label: 'Pagamento Manual', icon: ArrowRightLeft },
    { id: 'quick-transactions', label: 'Pagamentos automáticos', icon: Zap },
    { id: 'savings', label: 'Poupança', icon: PiggyBank },
    { id: 'credit', label: 'Crédito', icon: PiggyBank },
    { id: 'legado', label: 'Legado', icon: Shield },
  ];

  return (
    <div className="w-64 h-screen bg-gray-800 text-white flex flex-col">
      <div className="p-4 text-2xl font-bold">ValTeen</div>
      <nav className="mt-6 flex-1">
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <a
                href="#"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 ${activeTab === tab.id ? 'bg-gray-700' : ''}`}>
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4">
        <button
          onClick={openChangePasswordModal}
          className="flex items-center w-full px-4 py-3 text-left text-gray-400 hover:bg-gray-700"
        >
          <KeyRound className="w-5 h-5 mr-3" />
          Alterar Senha
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default StudentSidebar;