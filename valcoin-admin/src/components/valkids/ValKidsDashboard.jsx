import React, { useState, useEffect } from 'react';
import { getStudentValcoinDashboard, getStudentTransactionRules } from '../../services';
import ValKidsPiggyBank from './ValKidsPiggyBank';
import ValKidsTap from './ValKidsTap';

const ValKidsDashboard = ({ onLogout }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [achievableRules, setAchievableRules] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [dashboard, rules] = await Promise.all([
        getStudentValcoinDashboard(),
        getStudentTransactionRules(),
      ]);

      const processedDashboard = {
        ...dashboard,
        saldo: dashboard.saldo ? parseFloat(dashboard.saldo) : 0,
        transactions: dashboard.transactions ? dashboard.transactions.map(tx => ({
          ...tx,
          montante: tx.montante ? parseFloat(tx.montante) : 0,
        })) : [],
      };

      const processedRules = rules.map(rule => ({
        ...rule,
        montante: rule.montante ? parseFloat(rule.montante) : 0,
      }));

      setDashboardData(processedDashboard);
      setTransactions(processedDashboard.transactions || []);
      setAchievableRules(processedRules.filter(rule => rule.icon && rule.destino_permitido === 'ALUNO'));
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

  const handleTransactionCreated = () => {
    fetchData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-yellow-50 text-2xl font-bold text-yellow-800">A carregar...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen bg-red-50 text-2xl font-bold text-red-800">{error}</div>;
  }

  

  const receivedIcons = transactions.filter(t => t.icon && t.tipo === 'CREDITO').map(t => ({ id: t.id, icon: t.icon, descricao: t.descricao }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-orange-500" style={{ fontFamily: '"Comic Sans MS", cursive' }}>ValKids</h1>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-colors font-semibold"
          >
            Sair
          </button>
        </header>

        <main className="space-y-8">
          <ValKidsPiggyBank saldo={dashboardData?.saldo || 0} transactions={transactions} />
          
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-orange-600 mb-4 text-center" style={{ fontFamily: '"Comic Sans MS", cursive' }}>As minhas conquistas</h2>
            
            <div className="flex flex-wrap justify-center gap-6 mb-6 pb-4 border-b border-orange-200">
              {receivedIcons.length > 0 ? (
                receivedIcons.map(item => (
                  <div key={item.id} className="text-center transform hover:scale-110 transition-transform" title={item.descricao}>
                    <div className="w-48 h-48 mx-auto flex items-center justify-center" dangerouslySetInnerHTML={{ __html: item.icon }}></div>
                  </div>
                ))
              ) : (
                <p className="text-yellow-800">Ainda não tens nenhuma conquista. Completa tarefas para ganhar medalhas!</p>
              )}
            </div>

            <h3 className="text-xl font-bold text-orange-500 mb-4 text-center" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Histórico de Créditos</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {transactions.filter(t => t.tipo === 'CREDITO').length > 0 ? (
                transactions.filter(t => t.tipo === 'CREDITO').map(transaction => (
                  <div key={transaction.id} className="flex items-center bg-yellow-50 p-3 rounded-lg shadow-sm">
                    <div className="flex-grow">
                      <p className="font-semibold text-yellow-800">{transaction.descricao}</p>
                      <p className="text-sm text-yellow-600">{new Date(transaction.data_transacao).toLocaleDateString()}</p>
                    </div>
                    <div className="font-bold text-lg text-green-600">+{transaction.montante.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <p className="text-yellow-800 text-center">Ainda não recebeste nenhuma moeda.</p>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-red-500 mb-4 text-center" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Os meus gastos</h2>
            
            <div className="flex flex-wrap justify-center gap-6 mb-6 pb-4 border-b border-red-200">
              {transactions.filter(t => t.tipo === 'DEBITO' && t.icon).length > 0 ? (
                transactions.filter(t => t.tipo === 'DEBITO' && t.icon).map(transaction => (
                  <div key={transaction.id} className="text-center transform hover:scale-110 transition-transform" title={transaction.descricao}>
                    <div className="w-48 h-48 mx-auto flex items-center justify-center" style={{ filter: 'grayscale(100%)', opacity: 0.6 }} dangerouslySetInnerHTML={{ __html: transaction.icon }}></div>
                  </div>
                ))
              ) : (
                <p className="text-red-800 text-center">Nenhuma moeda gasta com ícone para mostrar.</p>
              )}
            </div>

            <h3 className="text-xl font-bold text-red-500 mb-4 text-center" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Histórico de Débitos</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {transactions.filter(t => t.tipo === 'DEBITO').length > 0 ? (
                transactions.filter(t => t.tipo === 'DEBITO').map(transaction => (
                  <div key={transaction.id} className="flex items-center bg-red-50 p-3 rounded-lg shadow-sm">
                    <div className="flex-grow">
                      <p className="font-semibold text-red-800">{transaction.descricao}</p>
                      <p className="text-sm text-red-600">{new Date(transaction.data_transacao).toLocaleDateString()}</p>
                    </div>
                    <div className="font-bold text-lg text-red-600">-{transaction.montante.toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <p className="text-red-800 text-center">Ainda não gastaste nenhuma moeda.</p>
              )}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-orange-600 mb-4 text-center" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Como ganhar mais moedas</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {achievableRules.length > 0 ? (
                achievableRules.map(rule => (
                  <div key={rule.id} className="text-center transform hover:scale-110 transition-transform" title={`${rule.nome} (+${rule.montante})`}>
                    <div className="w-48 h-48 mx-auto flex items-center justify-center" dangerouslySetInnerHTML={{ __html: rule.icon }}></div>
                  </div>
                ))
              ) : (
                <p className="text-yellow-800">De momento não há novas moedas para conquistar.</p>
              )}
            </div>
          </div>

          <ValKidsTap 
            student={dashboardData?.student}
            onTransactionCreated={handleTransactionCreated}
          />
        </main>
      </div>
    </div>
  );
};

export default ValKidsDashboard;
