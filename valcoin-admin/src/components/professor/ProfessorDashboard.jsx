// src/components/professor/ProfessorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { getProfessorValcoinDashboard, getUsers } from '../../services';
import ProfessorSidebar from './ProfessorSidebar';
import ProfessorTransactionForm from './ProfessorTransactionForm';
import ProfessorTap from './ProfessorTap';
import StudentEvaluation from './StudentEvaluation'; // Import the new component
import ProfessorHouseManagement from './ProfessorHouseManagement'; // Import the new component
import ValCoinIcon from '../icons/ValCoinIcon';
import ChangePasswordModal from '../ChangePasswordModal';

const ProfessorDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [data, allUsers] = await Promise.all([
        getProfessorValcoinDashboard(),
        getUsers(),
      ]);
      
      const processedData = {
        ...data,
        saldo: data.saldo ? parseFloat(data.saldo) : 0,
        transactions: data.transactions ? data.transactions.map(tx => ({
          ...tx,
          montante: tx.montante ? parseFloat(tx.montante) : 0,
        })) : [],
      };

      setDashboardData(processedData);
      setUsers(allUsers);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
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

  // Callback para recarregar dados após criar transação
  const handleTransactionCreated = () => {
    fetchData();
    // Opcional: voltar para o dashboard
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
              {tx.descricao && tx.descricao.includes('[IVA') && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  IVA
                </span>
              )}
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">{tx.descricao}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                {tx.tipo_para_professor === 'CREDITO' 
                  ? `📥 Recebido de: ${tx.remetente_nome}`
                  : `📤 Enviado para: ${tx.destinatario_nome}`}
              </p>
              <p className="text-xs text-gray-500">
                🕒 {new Date(tx.data_transacao).toLocaleString('pt-PT')}
              </p>
            </div>
          </div>
          <div className="text-right ml-4">
            <p className={`text-lg font-semibold ${
              tx.tipo_para_professor === 'CREDITO' 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              {tx.tipo_para_professor === 'CREDITO' ? '+' : '-'}{tx.montante ? tx.montante.toFixed(2) : '0.00'} <ValCoinIcon className="w-4 h-4 inline-block" />
            </p>
          </div>
        </div>
      </div>
    </li>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Dashboard de {dashboardData?.professor?.nome || 'Professor'}
          </h2>
          <p className="text-gray-600 mt-1">Gerancie os seus pagamentos e acompanhe o seu saldo</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Atualizando...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </>
          )}
        </button>
      </div>

      {/* Saldo Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Saldo Atual</p>
            <p className="text-4xl font-bold mt-1">
              {dashboardData?.saldo?.toFixed(2) || '0.00'} <ValCoinIcon className="w-8 h-8 inline-block" />
            </p>
          </div>
          <div className="p-3 bg-white bg-opacity-20 rounded-full">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('new-transaction')}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Novo Pagamento</h3>
              <p className="text-sm text-gray-600">Faça um novo pagamento manual</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('tap-rapido')}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Pagamentos automáticos</h3>
              <p className="text-sm text-gray-600">Usar regras pré-definidas</p>
            </div>
          </div>
        </button>
      </div>

      {/* Transactions History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Histórico das transações</h3>
            <span className="text-sm text-gray-500">
              {dashboardData?.transactions?.length || 0} transações
            </span>
          </div>
        </div>

        <div className="p-6">
          {dashboardData?.transactions && dashboardData.transactions.length > 0 ? (
            <ul className="space-y-4">
              {dashboardData.transactions
                .sort((a, b) => new Date(b.data_transacao) - new Date(a.data_transacao))
                .slice(0, 10)
                .map(renderTransactionCard)
              }
            </ul>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma transação</h3>
              <p className="mt-1 text-sm text-gray-500">Comece criando sua primeira transação.</p>
              <div className="mt-6">
                <button
                  onClick={() => setActiveTab('new-transaction')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Nova Transação
                </button>
              </div>
            </div>
          )}

          {dashboardData?.transactions && dashboardData.transactions.length > 10 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Mostrando as 10 transações mais recentes de {dashboardData.transactions.length} no total
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'new-transaction':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <ProfessorTransactionForm 
              users={users} 
              onTransactionCreated={handleTransactionCreated}
            />
          </div>
        );
      case 'tap-rapido':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <ProfessorTap 
              users={users} 
              transactionRules={dashboardData.transactionRules} 
              transactions={dashboardData.transactions} 
              subjects={dashboardData.subjects} 
              enrollments={dashboardData.enrollments} 
              studentClassEnrollments={dashboardData.studentClassEnrollments}
              professorAssignments={dashboardData.professorAssignments}
              setUsers={setUsers} 
              professor={dashboardData.professor} 
              onTransactionCreated={handleTransactionCreated} />
          </div>
        );
      case 'avaliacao': // New case
        return (
          <StudentEvaluation 
            professor={dashboardData.professor}
            users={users}
            subjects={dashboardData.subjects}
            enrollments={dashboardData.enrollments}
            professorAssignments={dashboardData.professorAssignments}
          />
        );
      case 'manage-house': // New case
        return <ProfessorHouseManagement currentUser={dashboardData?.professor} />;
      default:
        return null;
    }
  };

  if (error && !dashboardData) {
    return (
      <div className="flex h-screen bg-gray-100">
        <ProfessorSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 p-6 overflow-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-800 font-medium">Erro ao carregar dados</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex h-screen bg-gray-100">
        <ProfessorSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 p-6 overflow-auto">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div>
              <div className="h-8 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
            
            {/* Saldo card skeleton */}
            <div className="h-32 bg-gray-300 rounded-lg"></div>
            
            {/* Quick actions skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-20 bg-gray-300 rounded-lg"></div>
              <div className="h-20 bg-gray-300 rounded-lg"></div>
            </div>
            
            {/* Transactions skeleton */}
            <div className="space-y-4">
              <div className="h-6 bg-gray-300 rounded w-1/4"></div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-300 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ProfessorSidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={onLogout} openChangePasswordModal={openChangePasswordModal} />
      <div className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </div>
      <ChangePasswordModal showModal={showChangePasswordModal} closeModal={closeChangePasswordModal} />
    </div>
  );
};

export default ProfessorDashboard;