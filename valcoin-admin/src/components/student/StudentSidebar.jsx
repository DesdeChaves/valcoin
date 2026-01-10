// src/components/student/StudentSidebar.jsx
import React from 'react';
import { LayoutDashboard, ArrowRightLeft, Zap, PiggyBank, Shield, KeyRound, X } from 'lucide-react';

const StudentSidebar = ({ activeTab, setActiveTab, isSidebarOpen, setSidebarOpen }) => {
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
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isSidebarOpen ? 'block' : 'hidden'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <div
        className={`w-64 h-screen bg-indigo-800 text-indigo-100 flex flex-col fixed md:relative z-30 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-4 text-2xl font-bold text-white flex items-center justify-between">
          <span>Aurora Aluno</span>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-indigo-100 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="mt-6 flex-1">
          <ul>
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (window.innerWidth < 768) { // md breakpoint
                        setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-4 py-3 transition-colors duration-200 ${activeTab === tab.id ? 'bg-indigo-700 text-white' : 'hover:bg-indigo-700 text-indigo-100'}`}>
                  <tab.icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 space-y-2">
        </div>
      </div>
    </>
  );
};

export default StudentSidebar;