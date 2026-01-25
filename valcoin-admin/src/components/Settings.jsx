import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, getUsers } from '../services/api';
import Categories from './Categories'; // Import the new component
import Ciclos from './Ciclos';
import Dominios from './Dominios';
import Coordenadores from './Coordenadores';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('general'); // State for active tab

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSettings();
        if (!data.taxasIVA) {
          data.taxasIVA = {
            isento: 0,
            tipo1: 0,
            tipo2: 0,
            tipo3: 0,
          };
        }
        if (!data.quiz_question_time_seconds) {
          data.quiz_question_time_seconds = 5;
        }
        setSettings(data);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchSettings();
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = (type === 'checkbox' || (e.target.tagName === 'SELECT' && (value === 'true' || value === 'false'))) 
                ? (checked || value === 'true') 
                : value;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setSettings((prevSettings) => ({
        ...prevSettings,
        [parent]: {
          ...prevSettings[parent],
          [child]: val,
        },
      }));
    } else {
      setSettings((prevSettings) => ({
        ...prevSettings,
        [name]: val,
      }));
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Falha ao salvar as configurações.');
    }
  };

  const handleRunInterestPayment = async () => {
    try {
      const response = await fetch('/api/admin/run-interest-payment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Pagamento de juros executado: ${data.message}`);
      } else {
        throw new Error(data.error || 'Falha ao executar o pagamento de juros.');
      }
    } catch (error) {
      console.error('Failed to run interest payment:', error);
      alert(error.message);
    }
  };

  if (!settings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Configurações do Sistema</h2>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('general')}
            className={`${activeTab === 'general' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Geral
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`${activeTab === 'categories' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('ciclos')}
            className={`${activeTab === 'ciclos' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Ciclos
          </button>
          <button
            onClick={() => setActiveTab('dominios')}
            className={`${activeTab === 'dominios' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Domínios
          </button>
          <button
            onClick={() => setActiveTab('coordenadores')}
            className={`${activeTab === 'coordenadores' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Coordenadores
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Configurações Gerais</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permitir Registo Externo</label>
                  <select
                    name="allow_external_registration"
                    value={settings.allow_external_registration ? 'true' : 'false'}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sistema Ativo</label>
                  <select
                    name="sistemaAtivo"
                    value={settings.sistemaAtivo}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fase Piloto</label>
                  <select
                    name="fasePiloto"
                    value={settings.fasePiloto}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sistema de Crédito</label>
                  <select
                    name="creditSystemEnabled"
                    value={settings.creditSystemEnabled}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Acumulação (VC)</label>
                  <input
                    type="number"
                    name="limiteAcumulacao"
                    value={settings.limiteAcumulacao}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo por Pergunta do Quiz (segundos)</label>
                  <input
                    type="number"
                    name="quiz_question_time_seconds"
                    value={settings.quiz_question_time_seconds || 5}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Configurações Fiscais</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IRS (%)</label>
                  <input
                    type="number"
                    name="taxaIRS"
                    value={settings.taxaIRS}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA Isento (%)</label>
                  <input
                    type="number"
                    name="taxasIVA.isento"
                    value={settings.taxasIVA.isento}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA Tipo 1 (%)</label>
                  <input
                    type="number"
                    name="taxasIVA.tipo1"
                    value={settings.taxasIVA.tipo1}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA Tipo 2 (%)</label>
                  <input
                    type="number"
                    name="taxasIVA.tipo2"
                    value={settings.taxasIVA.tipo2}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA Tipo 3 (%)</label>
                  <input
                    type="number"
                    name="taxasIVA.tipo3"
                    value={settings.taxasIVA.tipo3}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utilizador para receber o IVA</label>
                  <select
                    name="ivaDestinationUserId"
                    value={settings.ivaDestinationUserId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um utilizador</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utilizador para pagar os juros</label>
                  <select
                    name="interestSourceUserId"
                    value={settings.interestSourceUserId}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um utilizador</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Isenção 1º Ciclo</label>
                  <select
                    name="isencao1Ciclo"
                    value={settings.isencao1Ciclo}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Plafonds e Limites</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plafond Base Mensal (VC)</label>
                  <input
                    type="number"
                    name="plafondBaseMensal"
                    value={settings.plafondBaseMensal}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Inatividade (%)</label>
                  <input
                    type="number"
                    name="taxaInatividade"
                    value={settings.taxaInatividade}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Ações do Sistema</h3>
              <div className="space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                  Gerar Relatório Mensal
                </button>
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">
                  Exportar Dados
                </button>
                <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700">
                  Backup Sistema
                </button>
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700">
                  Limpar Cache
                </button>
                <button onClick={handleRunInterestPayment} className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700">
                  Executar Pagamento de Juros
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Configurações de Salário dos Professores</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dia do Pagamento (1-28)</label>
                  <input
                    type="number"
                    name="professorSalaryDay"
                    value={settings.professorSalaryDay || ''}
                    onChange={handleChange}
                    min="1"
                    max="28"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pagamento de Salários</label>
                  <select
                    name="professorSalaryEnabled"
                    value={settings.professorSalaryEnabled}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montante por Aluno (VC)</label>
                  <input
                    type="number"
                    name="professorSalaryAmountPerStudent"
                    value={settings.professorSalaryAmountPerStudent || ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Email (Brevo)</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brevo API Key</label>
                  <input
                    type="password"
                    name="BREVO_API_KEY"
                    value={settings.BREVO_API_KEY || ''}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enviar Emails Reais</label>
                  <select
                    name="ENVIAR_EMAILS_REAIS"
                    value={settings.ENVIAR_EMAILS_REAIS ? 'true' : 'false'}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                </div> */}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="mt-6">
          <Categories />
        </div>
      )}

      {activeTab === 'ciclos' && (
        <div className="mt-6">
          <Ciclos />
        </div>
      )}

      {activeTab === 'dominios' && (
        <div className="mt-6">
          <Dominios />
        </div>
      )}

      {activeTab === 'coordenadores' && (
        <div className="mt-6">
          <Coordenadores />
        </div>
      )}
    </div>
  );
};

export default Settings;
