import React, { useState } from 'react';
import { Plus, Search, UserPlus, UserCheck } from 'lucide-react';
import Table from './Table';

const Subjects = ({ subjects, setSubjects, openModal, openStudentEnrollmentModal, openTeacherAssignmentModal }) => {
  const [searchTerm, setSearchTerm] = useState('');

  console.log('Subjects component received:', subjects); // Debug

  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: 'nome', label: 'Nome' },
    { key: 'codigo', label: 'Código' },
    {
      key: 'ativo',
      label: 'Estado',
      render: (value) => (value ? 'Ativo' : 'Inativo'),
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
        additionalActions={(item) => (
          <>
            <button
              onClick={() => openStudentEnrollmentModal(item)}
              className="text-green-600 hover:text-green-800 mr-4"
              title="Inscrever Alunos"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={() => openTeacherAssignmentModal(item)}
              className="text-purple-600 hover:text-purple-800 mr-4"
              title="Atribuir Professores"
            >
              <UserCheck className="w-5 h-5" />
            </button>
          </>
        )}
      />
    </div>
  );
};

export default Subjects;
