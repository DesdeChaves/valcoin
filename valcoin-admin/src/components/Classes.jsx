// Classes.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { debounce } from 'lodash';
import Table from './Table';

const Classes = ({ classes, setClasses, users, openModal, ciclos, isLoading, error }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getProfessorName = (diretor_turma_id) => {
    if (!diretor_turma_id) return 'Nenhum';
    const professor = users.find((user) => user.id === diretor_turma_id && user.tipo_utilizador === 'PROFESSOR');
    return professor ? professor.nome : 'N/A';
  };

  const getCicloName = (ciclo_id) => {
    const ciclo = ciclos.find((c) => c.id === ciclo_id);
    return ciclo ? ciclo.nome : 'N/A';
  };

  const filteredClasses = useMemo(() => {
    if (!classes || !Array.isArray(classes)) return [];
    return classes.filter((cls) => {
      if (!cls || !cls.nome) return false;
      return (
        cls.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.ano_letivo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [classes, searchTerm]);

  const columns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nome', label: 'Nome' },
    { key: 'ano_letivo', label: 'Ano Letivo' },
    {
      key: 'ciclo_id',
      label: 'Ciclo',
      render: (ciclo_id) => getCicloName(ciclo_id),
    },
    {
      key: 'diretor_turma_id',
      label: 'Diretor de Turma',
      render: (diretor_turma_id) => getProfessorName(diretor_turma_id),
    },
    {
      key: 'ativo',
      label: 'Estado',
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            value ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
          }`}
        >
          {value ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ];

  const debouncedSetSearchTerm = useMemo(() => debounce(setSearchTerm, 300), []);

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (error) return <p className="text-red-500 p-4">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Turmas</h2>
        <button
          onClick={() => openModal('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          aria-label="Criar nova turma"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Turma</span>
        </button>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou ano letivo..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => debouncedSetSearchTerm(e.target.value)}
            aria-label="Pesquisar turmas"
          />
        </div>
      </div>
      {filteredClasses.length === 0 && (
        <p className="text-gray-500">Nenhuma turma encontrada.</p>
      )}
      <Table data={filteredClasses} columns={columns} openModal={openModal} />
    </div>
  );
};

export default Classes;
