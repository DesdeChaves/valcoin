import React, { useState, useEffect } from 'react';
import { XCircle, ArrowRight, Loader, Check } from 'lucide-react';
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionGroup,
  approveTransaction, // Add this import
} from '../services/api';
import ValCoinIcon from './icons/ValCoinIcon';

const TransactionModal = ({ showModal, closeModal, modalType, selectedItem, setTransactions, users, settings, onApprove }) => {
  const [formData, setFormData] = useState({
    utilizador_origem_id: '',
    utilizador_destino_id: '',
    montante: '',
    tipo: 'CREDITO',
    descricao: '',
    status: 'PENDENTE',
    taxa_iva_ref: 'isento',
  });
  const [errors, setErrors] = useState({});
  const [transactionPair, setTransactionPair] = useState([]);
  const [isLoadingPair, setIsLoadingPair] = useState(false);

  const activeUsers = users?.filter((user) => user.ativo) || [];

  useEffect(() => {
    const loadTransactionGroup = async () => {
      if (modalType === 'view' && selectedItem?.transaction_group_id) {
        setIsLoadingPair(true);
        setErrors({});
        try {
          const groupTransactions = await getTransactionGroup(selectedItem.transaction_group_id);
          console.log('Loaded transaction group:', groupTransactions);
          setTransactionPair(groupTransactions);
        } catch (error) {
          console.error('Error loading transaction group:', error);
          setErrors({ pair: 'Erro ao carregar detalhes da transação' });
          setTransactionPair([selectedItem]);
        } finally {
          setIsLoadingPair(false);
        }
      } else {
        setTransactionPair([]);
      }
    };

    loadTransactionGroup();
  }, [modalType, selectedItem]);

  useEffect(() => {
    if (selectedItem) {
      setFormData({
        utilizador_origem_id: selectedItem.utilizador_origem_id || '',
        utilizador_destino_id: selectedItem.utilizador_destino_id || '',
        montante: selectedItem.montante || '',
        tipo: selectedItem.tipo || 'CREDITO',
        descricao: selectedItem.descricao || '',
        status: selectedItem.status || 'PENDENTE',
        taxa_iva_ref: selectedItem.taxa_iva_ref || 'isento',
      });
    } else {
      setFormData({
        utilizador_origem_id: '',
        utilizador_destino_id: '',
        montante: '',
        tipo: 'CREDITO',
        descricao: '',
        status: 'PENDENTE',
        taxa_iva_ref: 'isento',
      });
    }
    setErrors({});
  }, [selectedItem, modalType]);

  if (!showModal) return null;

  const isViewMode = modalType === 'view';
  const isEditMode = modalType === 'edit';
  const isCreateMode = modalType === 'create';
  const isDeleteMode = modalType === 'delete';

  const validateForm = () => {
    const newErrors = {};
    if (!formData.utilizador_origem_id) newErrors.utilizador_origem_id = 'Utilizador origem é obrigatório';
    if (!formData.utilizador_destino_id) newErrors.utilizador_destino_id = 'Utilizador destino é obrigatório';
    if (formData.utilizador_origem_id === formData.utilizador_destino_id) {
      newErrors.utilizador_destino_id = 'Utilizador destino deve ser diferente do utilizador origem';
    }
    if (!formData.montante || isNaN(formData.montante) || parseFloat(formData.montante) <= 0) {
      newErrors.montante = 'Montante é obrigatório e deve ser um número positivo';
    }
    if (!formData.descricao) newErrors.descricao = 'Descrição é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const transactionData = { ...formData, montante: parseFloat(formData.montante) };

      if (isCreateMode) {
        const newTransaction = await createTransaction(transactionData);
        setTransactions((prev) => {
          const filtered = prev.filter(t => !t.descricao.includes('[Contrapartida]'));
          return [...filtered, newTransaction];
        });
      } else if (isEditMode) {
        const updatedTransaction = await updateTransaction(selectedItem.id, transactionData);
        setTransactions((prev) =>
          prev.map((t) => {
            if (t.id === selectedItem.id) {
              return updatedTransaction;
            }
            return t;
          })
        );
      }
      closeModal();
    } catch (error) {
      setErrors({ general: error.response?.data?.error || error.message || 'Erro ao salvar transação.' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTransaction(selectedItem.id);
      setTransactions((prev) => prev.filter((txn) => txn.transaction_group_id !== selectedItem.transaction_group_id));
      closeModal();
    } catch (error) {
      setErrors({ general: error.response?.data?.error || error.message || 'Erro ao excluir transação.' });
    }
  };

  const handleApprove = async () => {
    try {
      await onApprove(selectedItem.id);
      closeModal();
    } catch (error) {
      setErrors({ general: error.response?.data?.error || error.message || 'Erro ao aprovar transação.' });
    }
  };

  const getUserName = (userId) => {
    const user = activeUsers.find((u) => u.id === userId);
    return user ? user.nome : 'Utilizador não encontrado';
  };

  const formatCurrency = (amount) => {
    return <>{`${parseFloat(amount).toFixed(2)}`}<ValCoinIcon className="w-4 h-4 inline-block" /></>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'PENDENTE': { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      'APROVADA': { color: 'bg-green-100 text-green-800', text: 'Aprovada' },
      'REJEITADA': { color: 'bg-red-100 text-red-800', text: 'Rejeitada' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTipoBadge = (tipo) => {
    const tipoConfig = {
      'CREDITO': { color: 'bg-blue-100 text-blue-800', text: 'Crédito' },
      'DEBITO': { color: 'bg-orange-100 text-orange-800', text: 'Débito' }
    };
    const config = tipoConfig[tipo] || { color: 'bg-gray-100 text-gray-800', text: tipo };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const TransactionDetail = ({ transaction, title, isCounterpart = false }) => (
    <div className={`p-4 rounded-lg border ${isCounterpart ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
      <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center justify-between">
        {title}
        <div className="flex space-x-2">
          {getTipoBadge(transaction.tipo)}
          {getStatusBadge(transaction.status)}
        </div>
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="font-medium text-gray-600">Origem:</div>
        <div className="text-gray-900">{getUserName(transaction.utilizador_origem_id)}</div>
        
        <div className="font-medium text-gray-600">Destino:</div>
        <div className="text-gray-900">{getUserName(transaction.utilizador_destino_id)}</div>

        <div className="font-medium text-gray-600">Montante:</div>
        <div className="text-gray-900 font-semibold">{formatCurrency(transaction.montante)}</div>

        <div className="font-medium text-gray-600">Taxa IVA:</div>
        <div className="text-gray-900">{transaction.taxa_iva_valor}% ({transaction.taxa_iva_ref})</div>

        <div className="font-medium text-gray-600">Data:</div>
        <div className="text-gray-900">{formatDate(transaction.data_transacao)}</div>

        <div className="col-span-2 font-medium text-gray-600 mt-2">Descrição:</div>
        <div className="col-span-2 text-gray-900 bg-white p-2 rounded border">
          {transaction.descricao}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              {isViewMode && 'Detalhes da Transação'}
              {isEditMode && 'Editar Transação'}
              {isCreateMode && 'Nova Transação'}
              {isDeleteMode && 'Confirmar Exclusão'}
            </h3>
            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          {isDeleteMode ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Tem certeza que deseja excluir a transação "{selectedItem.descricao}"? 
                Esta ação irá remover tanto a transação original quanto a sua contrapartida e não pode ser desfeita.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Origem:</strong> {getUserName(selectedItem.utilizador_origem_id)}</div>
                  <div><strong>Destino:</strong> {getUserName(selectedItem.utilizador_destino_id)}</div>
                  <div><strong>Montante:</strong> {formatCurrency(selectedItem.montante)}</div>
                  <div><strong>Status:</strong> {getStatusBadge(selectedItem.status)}</div>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={closeModal} 
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete} 
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </div>
          ) : isViewMode ? (
            <div className="space-y-6">
              {isLoadingPair ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin mr-2" />
                  <p className="text-gray-600">A carregar detalhes da transação...</p>
                </div>
              ) : errors.pair ? (
                <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                  {errors.pair}
                </div>
              ) : transactionPair.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-center text-sm text-gray-600 mb-4">
                    Sistema de Dupla Entrada Contabilística - Transação Completa
                  </div>
                  <div className="flex flex-col lg:flex-row items-center justify-center space-y-4 lg:space-y-0 lg:space-x-6">
                    {transactionPair.map((txn, index) => (
                      <React.Fragment key={txn.id}>
                        <div className="flex-1 w-full">
                          <TransactionDetail 
                            transaction={txn} 
                            title={txn.descricao.includes('[Contrapartida]') ? 'Transação de Contrapartida' : 'Transação Original'}
                            isCounterpart={txn.descricao.includes('[Contrapartida]')}
                          />
                        </div>
                        {index === 0 && transactionPair.length > 1 && (
                          <div className="flex-shrink-0">
                            <ArrowRight className="w-8 h-8 text-blue-500 lg:block hidden" />
                            <div className="lg:hidden text-blue-500 text-xs font-medium">↓</div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {transactionPair.length === 2 && (
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                      <strong>Nota:</strong> As duas transações mantêm sempre o mesmo status. 
                      Quando uma é aprovada/rejeitada, a outra automaticamente recebe o mesmo status.
                    </div>
                  )}
                  {selectedItem.status === 'PENDENTE' && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleApprove}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Aprovar</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <TransactionDetail transaction={selectedItem} title="Detalhes da Transação" />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utilizador Origem</label>
                  <select
                    name="utilizador_origem_id"
                    className={`w-full p-2 border rounded-lg ${errors.utilizador_origem_id ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.utilizador_origem_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione um utilizador</option>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.nome} ({user.tipo_utilizador})</option>
                    ))}
                  </select>
                  {errors.utilizador_origem_id && <p className="text-red-500 text-xs mt-1">{errors.utilizador_origem_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Utilizador Destino</label>
                  <select
                    name="utilizador_destino_id"
                    className={`w-full p-2 border rounded-lg ${errors.utilizador_destino_id ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.utilizador_destino_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione um utilizador</option>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.nome} ({user.tipo_utilizador})</option>
                    ))}
                  </select>
                  {errors.utilizador_destino_id && <p className="text-red-500 text-xs mt-1">{errors.utilizador_destino_id}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Montante <ValCoinIcon className="w-4 h-4 inline-block" /></label>
                  <input
                    type="number"
                    name="montante"
                    step="0.01"
                    min="0"
                    className={`w-full p-2 border rounded-lg ${errors.montante ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.montante}
                    onChange={handleInputChange}
                  />
                  {errors.montante && <p className="text-red-500 text-xs mt-1">{errors.montante}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select 
                    name="tipo" 
                    className="w-full p-2 border border-gray-300 rounded-lg" 
                    value={formData.tipo} 
                    onChange={handleInputChange}
                  >
                    <option value="CREDITO">Crédito</option>
                    <option value="DEBITO">Débito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    name="status" 
                    className="w-full p-2 border border-gray-300 rounded-lg" 
                    value={formData.status} 
                    onChange={handleInputChange}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADA">Aprovada</option>
                    <option value="REJEITADA">Rejeitada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA</label>
                  <select
                    name="taxa_iva_ref"
                    className={`w-full p-2 border rounded-lg ${errors.taxa_iva_ref ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.taxa_iva_ref}
                    onChange={handleInputChange}
                  >
                    {Object.keys(settings.taxasIVA).map((key) => (
                      <option key={key} value={key}>{key} ({settings.taxasIVA[key]}%)</option>
                    ))}
                  </select>
                  {errors.taxa_iva_ref && <p className="text-red-500 text-xs mt-1">{errors.taxa_iva_ref}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    name="descricao"
                    rows="3"
                    className={`w-full p-2 border rounded-lg ${errors.descricao ? 'border-red-500' : 'border-gray-300'}`}
                    value={formData.descricao}
                    onChange={handleInputChange}
                    placeholder="Descreva o motivo ou contexto da transação..."
                  />
                  {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao}</p>}
                </div>
              </div>
              
              {(isCreateMode || isEditMode) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Sistema de Dupla Entrada:</strong> {isCreateMode ? 'Será automaticamente criada' : 'Será automaticamente atualizada'} uma transação de contrapartida para manter o equilíbrio contabilístico. 
                    {isEditMode && ' Ambas as transações manterão o mesmo status.'}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={closeModal} 
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                {(isCreateMode || isEditMode) && (
                  <button 
                    onClick={handleSubmit} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {isCreateMode ? 'Criar Transação' : 'Salvar Alterações'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
