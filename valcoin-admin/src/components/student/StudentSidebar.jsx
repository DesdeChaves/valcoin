// src/components/student/StudentSidebar.jsx
import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Zap, PiggyBank, Shield, KeyRound } from 'lucide-react';

const StudentSidebar = ({ activeTab, setActiveTab }) => {
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
    <div className="w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col">
      <div className="p-4 text-2xl font-bold text-white">ValTeen</div>
      <nav className="mt-6 flex-1">
        <ul>
          {tabs.map((tab) => (
            <li key={tab.id}>
              <a
                href="#"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-3 transition-colors duration-200 ${activeTab === tab.id ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-700 text-indigo-100'}`}>
                <tab.icon className="w-5 h-5 mr-3" />
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 space-y-2">
      </div>
    </div>
  );
};

export default StudentSidebar;