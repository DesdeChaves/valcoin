import React from 'react';
import { Users, Shield, TrendingUp, MoreVertical, Edit3, Eye } from 'lucide-react';

const HouseCard = ({ house, onEdit, onView }) => {
  if (!house) {
    return null;
  }

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden group"
      style={{ borderTopColor: house.cor || '#6B7280', borderTopWidth: '4px' }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm"
              style={{ backgroundColor: house.cor || '#6B7280' }}
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
            {onView && (
              <button
                onClick={() => onView(house)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Eye size={16} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(house)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Edit3 size={16} />
              </button>
            )}
            {/* <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <MoreVertical size={16} />
            </button> */}
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
            <div className="font-bold text-gray-900">{(house.total_balance || 0).toLocaleString()} VC</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Membros</span>
              <Users size={12} className="text-blue-500" />
            </div>
            <div className="font-bold text-gray-900">{house.member_count || 0}</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Taxa de Poupança</span>
            <span className="font-medium text-green-600">{Math.round(house.savings_percentage || 0)}%</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-500">Dívida Total</span>
            <span className="font-medium text-red-600">{(house.total_debt || 0).toLocaleString()} VC</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Líder: {house.leader?.nome || 'N/A'}</span>
          <span>Criado em: {new Date(house.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default HouseCard;
