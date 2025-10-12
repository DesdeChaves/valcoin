import React, { useState, useEffect } from 'react';
import { getHouses, deleteHouse } from '../services/api';
import { 
  Home, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter,
  MoreVertical,
  Shield,
  Star,
  TrendingUp,
  Calendar,
  Eye
} from 'lucide-react';

import HouseCard from './HouseCard';

const Houses = ({ openModal, houses, refreshHouses }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedHouses, setSelectedHouses] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (houses) {
      setIsLoading(false);
    }
  }, [houses]);

  // Handle single house deletion
  const handleDeleteHouse = async (houseId) => {
    if (!window.confirm('Tem a certeza que quer apagar esta casa? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteHouse(houseId);
      refreshHouses();
      setSelectedHouses(prev => prev.filter(id => id !== houseId));
    } catch (error) {
      console.error('Falha ao apagar a casa:', error);
      alert('Falha ao apagar a casa. Por favor, tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk deletion
  const handleDeleteSelected = async () => {
    if (selectedHouses.length === 0) return;
    
    if (!window.confirm(`Tem a certeza que quer apagar ${selectedHouses.length} casa(s)? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Delete all selected houses
      await Promise.all(selectedHouses.map(houseId => deleteHouse(houseId)));
      
      // Update local state
      refreshHouses();
      setSelectedHouses([]);
    } catch (error) {
      console.error('Falha ao apagar as casas selecionadas:', error);
      alert('Falha ao apagar algumas casas. Por favor, tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredHouses = houses.filter(house => {
    const matchesSearch = house.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (house.valor_associado && house.valor_associado.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'high-balance') return matchesSearch && house.total_balance > 2000;
    if (filterStatus === 'low-debt') return matchesSearch && house.total_debt < 100;
    
    return matchesSearch;
  });

  const handleSelectHouse = (houseId) => {
    setSelectedHouses(prev => 
      prev.includes(houseId) 
        ? prev.filter(id => id !== houseId)
        : [...prev, houseId]
    );
  };

  const handleSelectAll = () => {
    setSelectedHouses(selectedHouses.length === filteredHouses.length ? [] : filteredHouses.map(h => h.house_id));
  };

  const KanbanCard = ({ house }) => (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
      style={{ borderTopColor: house.cor, borderTopWidth: '4px' }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
              style={{ backgroundColor: house.cor }}
            >
              {house.logo_url ? (
                <img src={house.logo_url} alt={house.nome} className="w-8 h-8 object-contain" />
              ) : (
                <Shield size={20} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">{house.nome}</h3>
              <p className="text-sm text-gray-500">{house.valor_associado}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => openModal('viewHouse', house)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Eye size={16} />
            </button>
            <button 
              onClick={() => openModal('editHouse', house)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Edit3 size={16} />
            </button>
            <button 
              onClick={() => handleDeleteHouse(house.house_id)}
              disabled={isDeleting}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{house.descricao}</p>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo</span>
              <TrendingUp size={12} className="text-green-500" />
            </div>
            <div className="font-bold text-gray-900">{house.total_balance.toLocaleString()} VC</div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Membros</span>
              <Users size={12} className="text-blue-500" />
            </div>
            <div className="font-bold text-gray-900">{house.member_count}</div>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Taxa de Poupança</span>
            <span className="font-medium text-green-600">{house.savings_percentage}%</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-500">Dívida Total</span>
            <span className="font-medium text-red-600">{house.total_debt} VC</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Líder: {house.leader?.nome}</span>
          <span>{new Date(house.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );

  const ListView = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-4 p-4">
                <input 
                  type="checkbox" 
                  checked={selectedHouses.length === filteredHouses.length && filteredHouses.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="text-left p-4 font-semibold text-gray-900">Casa</th>
              <th className="text-left p-4 font-semibold text-gray-900">Saldo</th>
              <th className="text-left p-4 font-semibold text-gray-900">Membros</th>
              <th className="text-left p-4 font-semibold text-gray-900">Taxa de Poupança</th>
              <th className="text-left p-4 font-semibold text-gray-900">Líder</th>
              <th className="text-left p-4 font-semibold text-gray-900">Criado em</th>
              <th className="text-right p-4 font-semibold text-gray-900">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredHouses.map((house) => (
              <tr key={house.house_id} className="hover:bg-gray-50 group">
                <td className="p-4">
                  <input 
                    type="checkbox" 
                    checked={selectedHouses.includes(house.house_id)}
                    onChange={() => handleSelectHouse(house.house_id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                      style={{ backgroundColor: house.cor }}
                    >
                      {house.logo_url ? (
                        <img src={house.logo_url} alt={house.nome} className="w-6 h-6 object-contain" />
                      ) : (
                        <Shield size={16} />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{house.nome}</div>
                      <div className="text-sm text-gray-500">{house.valor_associado}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-semibold text-gray-900">{house.total_balance.toLocaleString()} VC</div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-gray-900">{house.member_count}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${house.savings_percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-green-600">{house.savings_percentage}%</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-gray-900">{house.leader?.nome || '-'}</div>
                </td>
                <td className="p-4">
                  <div className="text-gray-500">{new Date(house.created_at).toLocaleDateString()}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal('viewHouse', house)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => openModal('editHouse', house)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteHouse(house.house_id)}
                      disabled={isDeleting}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      <Trash2 size={16} />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            Gestão de Casas
          </h1>
          <p className="text-gray-600 mt-1">Gerir casas da escola, membros e desempenho</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lista
            </button>
          </div>
          
          <button 
            onClick={() => openModal('createHouse')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            Criar Casa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Procurar casas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[160px]"
            >
              <option value="all">Todas as Casas</option>
              <option value="high-balance">Saldo Elevado</option>
              <option value="low-debt">Dívida Baixa</option>
            </select>
          </div>
          
          {selectedHouses.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedHouses.length} selecionadas
              </span>
              <button 
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'A apagar...' : 'Apagar Selecionadas'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredHouses.map((house) => (
            <KanbanCard key={house.house_id} house={house} />
          ))}
        </div>
      ) : (
        <ListView />
      )}

      {/* Empty State */}
      {!isLoading && filteredHouses.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma casa encontrada</h3>
          <p className="text-gray-600 mb-6">Comece por criar a sua primeira casa</p>
          <button 
            onClick={() => openModal('createHouse')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Criar Casa
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Casas</p>
              <p className="text-2xl font-bold text-gray-900">{houses.length}</p>
            </div>
            <Home className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Membros</p>
              <p className="text-2xl font-bold text-gray-900">
                {houses.reduce((sum, house) => sum + house.member_count, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {houses.reduce((sum, house) => sum + house.total_balance, 0).toLocaleString()} VC
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taxa Média de Poupança</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(houses.reduce((sum, house) => sum + house.savings_percentage, 0) / houses.length || 0)}%
              </p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Houses;
