import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import Table from './Table';
import DepartmentModal from './DepartmentModal';
import { getDepartments, createDepartment, updateDepartment, softDeleteDepartment } from '../services';
import { toast } from 'react-toastify';

const Departments = ({ users }) => {
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await getDepartments();
        setDepartments(data);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        toast.error('Não foi possível carregar os departamentos.');
      }
    };
    fetchDepartments();
  }, []);

  const filteredDepartments = departments.filter(
    (department) =>
      department.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      department.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (department.coordenador_nome && department.coordenador_nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'codigo', label: 'Código' },
    { key: 'coordenador_nome', label: 'Coordenador' },
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
      let result;
      if (modalType === 'create') {
        result = await createDepartment(formData);
        toast.success('Departamento criado com sucesso!');
      } else if (modalType === 'edit') {
        result = await updateDepartment(selectedItem.id, formData);
        toast.success('Departamento atualizado com sucesso!');
      } else if (modalType === 'delete') {
        result = await softDeleteDepartment(selectedItem.id);
        toast.success('Departamento desativado com sucesso!');
      }
      // Refresh data
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to save department:', error);
      toast.error(error.response?.data?.error || 'Ocorreu um erro ao salvar o departamento.');
      throw error; // Re-throw to keep modal open on error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Departamentos</h2>
        <button
          onClick={() => openModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Departamento</span>
        </button>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar departamentos..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Table
        data={filteredDepartments}
        columns={columns}
        openModal={openModal}
      />
      <DepartmentModal
        showModal={showModal}
        closeModal={closeModal}
        modalType={modalType}
        selectedItem={selectedItem}
        onSave={handleSave}
        users={users}
      />
    </div>
  );
};

export default Departments;
