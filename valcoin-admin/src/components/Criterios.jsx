import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import Table from './Table';
import CriterioModal from './CriterioModal';
import { getCriteriosSucesso, createCriterioSucesso, updateCriterioSucesso, softDeleteCriterioSucesso } from '../services';
import { toast } from 'react-toastify';

const Criterios = ({ departments }) => {
  const [criterios, setCriterios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchCriterios = async () => {
      try {
        const data = await getCriteriosSucesso();
        setCriterios(data);
      } catch (error) {
        console.error('Failed to fetch criterios:', error);
        toast.error('Não foi possível carregar os critérios.');
      }
    };
    fetchCriterios();
  }, []);

  const filteredCriterios = criterios.filter(
    (criterio) =>
      criterio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      criterio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (criterio.departamento_nome && criterio.departamento_nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nome', label: 'Nome' },
    { key: 'departamento_nome', label: 'Departamento' },
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
        await createCriterioSucesso(formData);
        toast.success('Critério criado com sucesso!');
      } else if (modalType === 'edit') {
        await updateCriterioSucesso(selectedItem.id, formData);
        toast.success('Critério atualizado com sucesso!');
      } else if (modalType === 'delete') {
        await softDeleteCriterioSucesso(selectedItem.id);
        toast.success('Critério desativado com sucesso!');
      }
      const data = await getCriteriosSucesso();
      setCriterios(data);
    } catch (error) {
      console.error('Failed to save criterio:', error);
      throw error; 
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Critérios de Sucesso</h2>
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
            placeholder="Pesquisar critérios..."
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
      <CriterioModal
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

export default Criterios;
