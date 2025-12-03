import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Table from './Table';
import DepartmentCell from './DepartmentCell';
import { getSubjects } from '../services';

const Subjects = ({ subjects, setSubjects, openModal, departments }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpdate = async () => {
    const updatedSubjects = await getSubjects();
    setSubjects(updatedSubjects);
  };

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (subject.departamento_nome && subject.departamento_nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'codigo', label: 'Código' },
    { 
      key: 'departamento_nome', 
      label: 'Departamento',
      render: (value, subject) => (
        <DepartmentCell 
          subject={subject} 
          departments={departments} 
          onUpdate={handleUpdate} 
        />
      )
    },
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Disciplinas</h2>
        <button
          onClick={() => openModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Disciplina</span>
        </button>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar disciplinas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Table
        data={filteredSubjects}
        columns={columns}
        openModal={openModal}
      />
    </div>
  );
};

export default Subjects;
