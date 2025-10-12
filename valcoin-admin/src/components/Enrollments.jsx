// src/components/Enrollments.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import Table from './Table';
import { createAlunoTurma, updateAlunoTurma, deleteAlunoTurma } from '../services/api';

const Enrollments = ({ alunoTurma, setAlunoTurma, users, classes, openModal }) => {
  const [searchTerm, setSearchTerm] = useState('');

  console.log('Enrollments component received:', {
    alunoTurmaLength: alunoTurma?.length,
    usersLength: users?.length,
    classesLength: classes?.length,
    openModalType: typeof openModal,
  });

  // Verificações de segurança
  const safeUsers = Array.isArray(users) ? users : [];
  const safeClasses = Array.isArray(classes) ? classes : [];
  const safeAlunoTurma = Array.isArray(alunoTurma) ? alunoTurma : [];

  // Função para obter nome do usuário
  const getUserName = (id) => {
    const user = safeUsers.find((user) => user.id === id);
    return user ? user.nome : 'Unknown';
  };

  // Função para obter nome da turma
  const getClassName = (id) => {
    const classData = safeClasses.find((c) => c.id === id);
    return classData ? classData.nome : 'Unknown';
  };

  // Filtrar matrículas baseado no termo de busca
  const filteredEnrollments = useMemo(() => {
    return safeAlunoTurma.filter((enrollment) => {
      if (!enrollment) return false;
      const studentName = getUserName(enrollment.aluno_id).toLowerCase();
      const className = getClassName(enrollment.turma_id).toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      return studentName.includes(searchLower) || className.includes(searchLower);
    });
  }, [safeAlunoTurma, searchTerm, safeUsers, safeClasses]);

  // Definir colunas da tabela
  const columns = [
    {
      key: 'aluno_id',
      label: 'Aluno',
      render: (value) => getUserName(value),
    },
    {
      key: 'turma_id',
      label: 'Turma',
      render: (value) => getClassName(value),
    },
    {
      key: 'ano_letivo',
      label: 'Ano Letivo',
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

  // Função para lidar com exclusão
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta matrícula?')) {
      try {
        console.log('Deleting enrollment:', id);
        await deleteAlunoTurma(id);
        setAlunoTurma((prevState) =>
          Array.isArray(prevState) ? prevState.filter((e) => e.id !== id) : []
        );
        console.log('Updated alunoTurma state after deletion');
      } catch (error) {
        console.error('Error deleting aluno_turma:', error);
        alert('Erro ao excluir matrícula');
      }
    }
  };

  // Adaptar openModal para o padrão do Table existente
  const handleTableModal = (action, item) => {
    console.log('handleTableModal called:', { action, item });

    if (typeof openModal !== 'function') {
      console.error('openModal is not a function:', openModal);
      alert('Funcionalidade não disponível');
      return;
    }

    switch (action) {
      case 'view':
        console.log('View enrollment:', item);
        alert(`Visualizar matrícula: ${getUserName(item.aluno_id)} - ${getClassName(item.turma_id)}`);
        break;
      case 'edit':
        console.log('Edit enrollment:', item);
        openModal('editAlunoTurma', item);
        break;
      case 'delete':
        console.log('Delete enrollment:', item);
        handleDelete(item.id);
        break;
      default:
        console.warn('Unknown action:', action);
    }
  };

  // Função segura para abrir modal de criação
  const handleCreateModal = () => {
    console.log('Opening create modal for alunoTurma');
    if (typeof openModal === 'function') {
      openModal('createAlunoTurma');
    } else {
      console.error('openModal is not a function:', openModal);
      alert('Erro: Função openModal não disponível');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Matrículas (Alunos-Turmas)</h2>
        <button
          onClick={handleCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={typeof openModal !== 'function'}
          title={typeof openModal !== 'function' ? 'Funcionalidade não disponível' : 'Matricular Aluno'}
        >
          <Plus className="w-4 h-4" />
          <span>Matricular Aluno</span>
        </button>
      </div>

      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar matrículas..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          Debug: openModal={typeof openModal}, users={safeUsers.length}, classes={safeClasses.length}, enrollments={filteredEnrollments.length}
        </div>
      )}

      <Table
        data={filteredEnrollments}
        columns={columns}
        openModal={handleTableModal}
        additionalActions={null}
      />
    </div>
  );
};

export default Enrollments;
