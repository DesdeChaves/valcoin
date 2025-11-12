// src/components/debug/TransactionDebugView.jsx
import React, { useState, useEffect } from 'react';
import { getProfessorValcoinDashboard, getSettings } from '../../services';

const TransactionDebugView = () => {
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, settingsData] = await Promise.all([
          getProfessorValcoinDashboard(),
          getSettings()
        ]);
        setTransactions(dashboardData.transactions || []);
        setSettings(settingsData);
      } catch (err) {
        console.error('Error fetching debug data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Carregando debug info...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Debug: Transações com IVA</h2>
      
      {/* Settings Debug */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-lg mb-3">Configurações de IVA:</h3>
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
          {JSON.stringify(settings?.taxasIVA, null, 2)}
        </pre>
      </div>

      {/* Transactions Debug */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-lg mb-3">Transações (Raw Data):</h3>
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div key={tx.id} className="border border-gray-200 rounded p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>ID:</strong> {tx.id}
                </div>
                <div>
                  <strong>Status:</strong> {tx.status}
                </div>
                <div>
                  <strong>Montante:</strong> {tx.montante} €
                </div>
                <div>
                  <strong>Taxa IVA Ref:</strong> 
                  <span className={`ml-1 px-2 py-1 rounded text-xs ${
                    tx.taxa_iva_ref === 'isento' ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    {tx.taxa_iva_ref || 'undefined'}
                  </span>
                </div>
                <div className="col-span-2">
                  <strong>Descrição:</strong> {tx.descricao}
                </div>
                <div className="col-span-2">
                  <strong>Data:</strong> {new Date(tx.data_transacao).toLocaleString('pt-PT')}
                </div>
                {settings?.taxasIVA && tx.taxa_iva_ref && (
                  <div className="col-span-2">
                    <strong>Taxa IVA Calculada:</strong> 
                    <span className="ml-1 font-mono">
                      {settings.taxasIVA[tx.taxa_iva_ref] || 0}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* Raw Transaction Object */}
              <details className="mt-3">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Ver JSON completo
                </summary>
                <pre className="bg-gray-100 p-3 rounded text-xs mt-2 overflow-auto">
                  {JSON.stringify(tx, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
        
        {transactions.length === 0 && (
          <p className="text-gray-500 text-center py-8">Nenhuma transação encontrada</p>
        )}
      </div>
    </div>
  );
};

export default TransactionDebugView;
