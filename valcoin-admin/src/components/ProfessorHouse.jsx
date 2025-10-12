import React, { useState, useEffect, useCallback } from 'react';
import { getMyHouse } from '../services/api';
import { 
  Home, 
  Users, 
  Edit3, 
  Shield, 
  TrendingUp, 
  Eye
} from 'lucide-react';

const ProfessorHouse = ({ openModal, currentUser }) => {
  const [house, setHouse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHouse = useCallback(async () => {
    try {
      setIsLoading(true);
      const houseData = await getMyHouse();
      if (houseData && houseData.inHouse === false) {
        setHouse(null);
      } else {
        setHouse(houseData);
      }
    } catch (err) {
      setError('Falha ao carregar os dados da casa.');
      console.error('Error fetching house data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHouse();
  }, [fetchHouse]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center py-12">{error}</div>;
  }

  if (!house) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Não está associado a nenhuma casa.</h3>
        <p className="text-gray-600">Contacte um administrador para ser associado a uma casa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            A minha Casa: {house.nome}
          </h1>
          <p className="text-gray-600 mt-1">Gerir a sua casa, membros e desempenho</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
          style={{ borderTopColor: house.cor, borderTopWidth: '4px' }}
        >
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
              </div>
            </div>
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">{house.descricao}</p>
          </div>

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

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Líder: {house.leader?.nome}</span>
              <span>{new Date(house.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorHouse;