import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import Table from './Table'; // Assuming Table is in the parent components directory
import CrisucessoFeedbackModal from './CrisucessoFeedbackModal'; // New modal
import { fetchCrisucessoFeedback, createCrisucessoFeedback, updateCrisucessoFeedback, softDeleteCrisucessoFeedback } from '../../utils/api'; // Corrected API path
import { toast } from 'react-toastify';

const CrisucessoFeedback = ({ departments }) => {
  const [criterios, setCriterios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchCriterios = useCallback(async () => {
    try {
      const data = await fetchCrisucessoFeedback();
      setCriterios(data);
    } catch (error) {
      console.error('Failed to fetch criterios de sucesso for feedback:', error);
      toast.error('Não foi possível carregar os critérios de sucesso.');
    }
  }, []);

  useEffect(() => {
    fetchCriterios();
  }, [fetchCriterios]);

  const filteredCriterios = criterios.filter(
    (criterio) =>
      criterio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      criterio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (criterio.departamentos_nomes && criterio.departamentos_nomes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nome', label: 'Nome' },
    { key: 'departamentos_nomes', label: 'Departamentos' },
    { key: 'ano_escolaridade_inicial', label: 'Ano' },
    { key: 'tipo_criterio', label: 'Tipo' },
    {
      key: 'ativo',
      label: 'Estado',
      render: (value) => (
        <span className={`px-2 py-1 rounded text-sm ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {value ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ];

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleSave = async (formData) => {
    try {
      if (modalType === 'create') {
        await createCrisucessoFeedback(formData);
        toast.success('Critério de sucesso criado com sucesso!');
      } else if (modalType === 'edit') {
        await updateCrisucessoFeedback(selectedItem.id, formData);
        toast.success('Critério de sucesso atualizado com sucesso!');
      } else if (modalType === 'delete') {
        await softDeleteCrisucessoFeedback(selectedItem.id);
        toast.success('Critério de sucesso desativado com sucesso!');
      }
      fetchCriterios(); // Refresh the list
      closeModal();
    } catch (error) {
      console.error('Failed to save criterio de sucesso:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar critério de sucesso.');
      throw error; 
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Critérios de Sucesso (Feedback)</h2>
        <button
          onClick={() => openModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Critério</span>
        </button>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar critérios de sucesso..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Table
        data={filteredCriterios}
        columns={columns}
        openModal={openModal}
      />
      <CrisucessoFeedbackModal
        showModal={showModal}
        closeModal={closeModal}
        modalType={modalType}
        selectedItem={selectedItem}
        onSave={handleSave}
        departments={departments}
      />
    </div>
  );
};

export default CrisucessoFeedback;
