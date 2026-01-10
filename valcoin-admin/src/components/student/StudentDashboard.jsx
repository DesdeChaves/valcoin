// src/components/student/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { getStudentAuroraDashboard, getStudentPayableUsers, getStudentTransactionRules, getStudentApplicableRules, checkStudentRuleApplicability, applyStudentTransactionRule, getClasses, getStudentsByClass } from '../../services/api';
import StudentSidebar from './StudentSidebar';
import StudentManualPayment from './StudentManualPayment';
import StudentTap from './StudentTap';
import Savings from './Savings'; // Import the new component
import Credit from './Credit'; // Import the new component
import MyHouse from './MyHouse';
import Legado from './Legado';
import ValCoinIcon from '../icons/ValCoinIcon';
import ChangePasswordModal from '../ChangePasswordModal';
import StudentHeader from './StudentHeader'; // Import StudentHeader

const StudentDashboard = ({ onLogout, currentUser }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getStudentAuroraDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard do aluno:', err);
      setError('Falha ao carregar os dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openChangePasswordModal = () => setShowChangePasswordModal(true);
  const closeChangePasswordModal = () => setShowChangePasswordModal(false);

  const handleTransactionCreated = () => {
    fetchData();
    setActiveTab('dashboard');
  };

  const renderTransactionCard = (tx) => (
    <li key={tx.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                tx.status === 'APROVADA' 
                  ? 'bg-green-100 text-green-800'
                  : tx.status === 'PENDENTE'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {tx.status}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">{tx.descricao}</h4>
            <div className="text-sm text-gray-600 space-y-1">
                <p>De: {tx.nome_origem} Para: {tx.nome_destino}</p>
              <p className="text-xs text-gray-500">
                🕒 {new Date(tx.data_transacao).toLocaleString('pt-PT')}
              </p>
            </div>
          </div>
          <div className="text-right ml-4">
            <p className={`text-lg font-semibold ${
              tx.tipo === 'CREDITO' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {tx.tipo === 'CREDITO' ? '+' : '-'}{tx.montante ? parseFloat(tx.montante).toFixed(2) : '0.00'} <ValCoinIcon className="w-4 h-4 inline-block" />
            </p>
          </div>
        </div>
      </div>
    </li>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard do Aluno</h2>
          <p className="text-gray-600 mt-1">Bem-vindo, {dashboardData?.student?.nome}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium">Saldo Disponível</p>
            <p className="text-4xl font-bold mt-1">
              {dashboardData?.saldo?.toFixed(2) || '0.00'} <ValCoinIcon className="w-8 h-8 inline-block" />
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Transações</h3>
        </div>
        <div className="p-6">
          {dashboardData?.transactions && dashboardData.transactions.length > 0 ? (
            <ul className="space-y-4">
              {dashboardData.transactions.slice(0, 10).map(renderTransactionCard)}
            </ul>
          ) : (
            <p>Nenhuma transação encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'manual-payment':
        return <StudentManualPayment onTransactionCreated={handleTransactionCreated} />; 
      case 'quick-transactions':
        return <StudentTap 
                student={dashboardData.student}
                onTransactionCreated={handleTransactionCreated} 
                getStudentPayableUsers={getStudentPayableUsers}
                getStudentTransactionRules={getStudentTransactionRules}
                getStudentApplicableRules={getStudentApplicableRules}
                checkStudentRuleApplicability={checkStudentRuleApplicability}
                applyStudentTransactionRule={applyStudentTransactionRule}
                getClasses={getClasses}
                getStudentsByClass={getStudentsByClass}
              />;
      case 'savings':
        return <Savings student={dashboardData.student} />;
      case 'credit':
        return <Credit student={dashboardData.student} />;
      case 'my-house':
        return <MyHouse currentUser={currentUser} />;
      case 'legado':
        return <Legado />;
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return <div>A carregar...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <StudentSidebar activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader onLogout={onLogout} openChangePasswordModal={openChangePasswordModal} currentUser={currentUser} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <ChangePasswordModal showModal={showChangePasswordModal} closeModal={closeChangePasswordModal} />
    </div>
  );
};

export default StudentDashboard;