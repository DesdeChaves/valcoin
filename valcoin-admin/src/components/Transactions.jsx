import React, { useState, useMemo } from 'react';
import { Plus, Search, Eye, Edit, Trash, Check, RefreshCw } from 'lucide-react';

const Transactions = ({ transactions, setTransactions, users, openModal, searchTerm, setSearchTerm, filterStatus, setFilterStatus, timeFilter, setTimeFilter, startDate, setStartDate, endDate, setEndDate, settings, onApprove, refreshTransactions }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleTimeFilterChange = (e) => {
    setTimeFilter(e.target.value);
    setStartDate(null);
    setEndDate(null);
    if (e.target.value !== 'custom') {
      refreshTransactions(e.target.value, null, null);
    }
  };

  const handleSearch = () => {
    refreshTransactions(timeFilter, startDate, endDate);
  };

  const getUserNameById = (id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.nome : 'Desconhecido';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `${parseFloat(amount).toFixed(2)}€`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDENTE: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      APROVADA: { color: 'bg-green-100 text-green-800', text: 'Aprovada' },
      REJEITADA: { color: 'bg-red-100 text-red-800', text: 'Rejeitada' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        if (transaction.descricao.includes('[Contrapartida]')) return false;
        const origemName = getUserNameById(transaction.utilizador_origem_id).toLowerCase();
        const destinoName = getUserNameById(transaction.utilizador_destino_id).toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return (
          (filterStatus === 'all' || transaction.status === filterStatus) &&
          (origemName.includes(searchLower) ||
            destinoName.includes(searchLower) ||
            transaction.descricao.toLowerCase().includes(searchLower))
        );
      });
  }, [transactions, searchTerm, filterStatus, users]);

  const sortedTransactions = useMemo(() => {
    let sortableTransactions = [...filteredTransactions];
    if (sortConfig.key) {
      sortableTransactions.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'montante' || sortConfig.key === 'taxa_iva_valor') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'data_transacao') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else {
          aValue = aValue?.toString().toLowerCase() || '';
          bValue = bValue?.toString().toLowerCase() || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableTransactions;
  }, [filteredTransactions, sortConfig]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Transações</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => openModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar transações..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Todos</option>
          <option value="PENDENTE">Pendente</option>
          <option value="APROVADA">Aprovada</option>
          <option value="REJEITADA">Rejeitada</option>
        </select>
        <select
          value={timeFilter}
          onChange={handleTimeFilterChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Desde sempre</option>
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mês</option>
          <option value="custom">Personalizado</option>
        </select>
        {timeFilter === 'custom' && (
          <>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </>
        )}
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Search className="w-4 h-4" />
          <span>Pesquisar</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('utilizador_origem_nome')}
              >
                Origem
                <SortIcon column="utilizador_origem_nome" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('utilizador_destino_nome')}
              >
                Destino
                <SortIcon column="utilizador_destino_nome" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('montante')}
              >
                Montante
                <SortIcon column="montante" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('data_transacao')}
              >
                Data
                <SortIcon column="data_transacao" />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status
                <SortIcon column="status" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getUserNameById(transaction.utilizador_origem_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getUserNameById(transaction.utilizador_destino_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(transaction.montante)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(transaction.data_transacao)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getStatusBadge(transaction.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openModal('view', transaction)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Visualizar"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {transaction.status === 'PENDENTE' && (
                      <>
                        <button
                          onClick={() => openModal('edit', transaction)}
                          className="text-green-600 hover:text-green-800"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onApprove(transaction.id)}
                          className="text-green-600 hover:text-green-800"
                          title="Aprovar"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openModal('delete', transaction)}
                      className="text-red-600 hover:text-red-800"
                      title="Excluir"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
