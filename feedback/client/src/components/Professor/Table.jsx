// src/components/Table.jsx
import React from 'react';
import { Eye, Edit, Trash } from 'lucide-react';

const Table = ({ data, columns, openModal, additionalActions }) => {
  console.log('Table component received:', {
    dataLength: data?.length,
    columnsLength: columns?.length,
    openModalType: typeof openModal,
  });

  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-gray-500">Nenhum dado disponível.</p>;
  }

  const safeOpenModal = (action, item) => {
    console.log('safeOpenModal called with:', { action, item });
    if (typeof openModal === 'function') {
      openModal(action, item);
    } else {
      console.error('openModal is not a function:', openModal);
      alert('Erro: Funcionalidade não disponível');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
            <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-100">
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 text-sm text-gray-900">
                  {column.render ? column.render(item[column.key], item) : item[column.key]}
                </td>
              ))}
              <td className="px-6 py-4 text-sm font-medium">
                <button
                  onClick={() => safeOpenModal('view', item)}
                  className="text-blue-600 hover:text-blue-800 mr-4"
                  disabled={typeof openModal !== 'function'}
                  title={typeof openModal !== 'function' ? 'Funcionalidade não disponível' : 'Visualizar'}
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => safeOpenModal('edit', item)}
                  className="text-yellow-600 hover:text-yellow-800 mr-4"
                  disabled={typeof openModal !== 'function'}
                  title={typeof openModal !== 'function' ? 'Funcionalidade não disponível' : 'Editar'}
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => safeOpenModal('delete', item)}
                  className="text-red-600 hover:text-red-800 mr-4"
                  disabled={typeof openModal !== 'function'}
                  title={typeof openModal !== 'function' ? 'Funcionalidade não disponível' : 'Excluir'}
                >
                  <Trash className="w-5 h-5" />
                </button>
                {additionalActions && additionalActions(item)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
