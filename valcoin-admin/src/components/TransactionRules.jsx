// src/components/TransactionRules.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getTransactionRules,
  createTransactionRule,
  updateTransactionRule,
  deleteTransactionRule,
} from '../services';
import TransactionRuleModal from './TransactionRuleModal';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

const TransactionRules = ({ transactionRules, setTransactionRules, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all'); // New state for category filter

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const data = await getTransactionRules();
      setTransactionRules(data);
    } catch (error) {
      console.error('Error fetching transaction rules:', error);
      toast.error(error.message || 'Erro ao carregar regras de transação.');
    }
  };

  const handleCreate = () => {
    setSelectedRule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransactionRule(id);
      setTransactionRules((prev) => prev.filter((rule) => rule.id !== id));
      toast.success('Regra de transação excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting transaction rule:', error);
      toast.error(error.message || 'Erro ao excluir regra de transação.');
    }
  };

  const handleSave = async (rule) => {
    try {
      if (rule.id) {
        const updatedRule = await updateTransactionRule(rule.id, rule);
        setTransactionRules((prev) =>
          prev.map((r) => (r.id === rule.id ? updatedRule : r))
        );
        toast.success('Regra de transação atualizada com sucesso!');
      } else {
        console.log('Sending payload to createTransactionRule:', rule);
        const newRule = await createTransactionRule(rule);
        setTransactionRules((prev) => [...prev, newRule]);
        toast.success('Regra de transação criada com sucesso!');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction rule:', error, {
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.error || 'Erro ao salvar regra de transação.');
    }
  };

  // Filter rules by category
  const filteredRules = categoryFilter === 'all'
    ? transactionRules
    : transactionRules.filter((rule) => rule.categoria === categoryFilter);

  const categories = [
    'all',
    'Moeda',
    'Sala de Aula',
    'Comunidades',
    'Cidadania e Valores',
    'Colaboração e Liderança',
    'Inovação e Criatividade',
    'Compromisso Global',
    'Materiais',
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Regras de Transação</h1>
        <div className="flex items-center space-x-4">
          <div>
            <label htmlFor="categoryFilter" className="text-sm font-medium text-gray-700 mr-2">Filtrar por Categoria:</label>
            <select
              id="categoryFilter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat === 'all' ? 'Todas' : cat}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="mr-2" size={20} />
            Adicionar Regra
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Montante
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Origem Permitida
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Destino Permitido
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Limite de Valor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Limite de Período
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Limite por Disciplina
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Taxa IVA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRules.map((rule) => (
              <tr key={rule.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {rule.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.tipo_transacao}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.montante}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.origem_permitida}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.destino_permitido}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.limite_valor}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.limite_periodo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.limite_por_disciplina ? 'Sim' : 'Não'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.categoria}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {rule.taxa_iva_ref}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <TransactionRuleModal
          rule={selectedRule}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          settings={settings}
        />
      )}
    </div>
  );
};

export default TransactionRules;