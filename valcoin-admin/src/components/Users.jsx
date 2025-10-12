import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader, RefreshCw, CircleDollarSign } from 'lucide-react';
import Table from './Table';

const Users = ({ users, openModal, isLoading, refreshUsers }) => {
  const [searchTerm, setSearchTerm] = useState('');

  console.log('Users component received:', { users, isLoading, refreshUsers: !!refreshUsers });

  // Log when users prop changes
  useEffect(() => {
    console.log('Users prop updated:', users);
  }, [users]);

  const filteredUsers = users.filter((user) => {
    const nome = user.nome || '';
    const email = user.email || '';
    const numero_mecanografico = user.numero_mecanografico || '';

    return (
      nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      numero_mecanografico.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const columns = [
    { key: 'numero_mecanografico', label: 'Número Mecanográfico' },
    { key: 'nome', label: 'Nome' },
    { key: 'tipo_utilizador', label: 'Tipo' },
    {
      key: 'saldo',
      label: 'Saldo',
      render: (value) => (
        <div className="flex items-center">
          <CircleDollarSign className="w-4 h-4 mr-2 text-yellow-500" />
          {`${parseFloat(value || 0).toFixed(2)} VC`}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Utilizadores</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => openModal('create')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Utilizador</span>
          </button>
          <button
            onClick={() => refreshUsers(true)} // Force refresh
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar utilizadores..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 animate-spin mr-2" />
          <p className="text-gray-600">A carregar utilizadores...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-gray-600 text-center py-4">Nenhum utilizador encontrado.</p>
      ) : (
        <Table data={filteredUsers} columns={columns} openModal={openModal} />
      )}
    </div>
  );
};

export default Users;
