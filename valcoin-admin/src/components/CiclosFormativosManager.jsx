import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { PlusCircle } from 'lucide-react';

const CiclosFormativosManager = ({ ciclos, users, openModal, onToggleAtivo, onDelete, onManageClasses }) => {
  const [filter, setFilter] = useState('true'); // 'true', 'false', 'all'

  const filteredCiclos = ciclos.filter(c => {
    if (filter === 'all') return true;
    return c.ativo === (filter === 'true');
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Gestão de Ciclos Formativos (EQAVET)</h2>
        <div className="flex items-center space-x-2">
           {/* Filter buttons */}
           <button
             onClick={() => setFilter('all')}
             className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
           >
             Todos
           </button>
           <button
             onClick={() => setFilter('true')}
             className={`px-3 py-1 rounded ${filter === 'true' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
           >
             Ativos
           </button>
           <button
             onClick={() => setFilter('false')}
             className={`px-3 py-1 rounded ${filter === 'false' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
           >
             Inativos
           </button>
           <button onClick={() => openModal('createCicloFormativo')} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
             <PlusCircle size={20} className="mr-2" />
             Novo Ciclo
           </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3">Designação</th>
              <th className="text-left p-3">Código</th>
              <th className="text-left p-3">Nível</th>
              <th className="text-left p-3">Período</th>
              <th className="text-left p-3">Responsável</th>
              <th className="text-left p-3">Ativo</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCiclos.length > 0 ? (
              filteredCiclos.map(ciclo => (
                <tr key={ciclo.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{ciclo.designacao}</td>
                  <td className="p-3">{ciclo.codigo_curso}</td>
                  <td className="p-3">{ciclo.nivel_qnq}</td>
                  <td className="p-3">{ciclo.ano_inicio}/{ciclo.ano_fim}</td>
                  <td className="p-3">{ciclo.responsavel_nome || <span className="text-gray-400">N/A</span>}</td>
                  <td className="p-3">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ciclo.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {ciclo.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button onClick={() => openModal('editCicloFormativo', ciclo)} className="text-blue-600 hover:underline">
                      Editar
                    </button>
                    <button onClick={() => onToggleAtivo(ciclo)} className="text-gray-600 hover:underline">
                      {ciclo.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => onDelete(ciclo)} className="text-red-600 hover:underline">
                      Apagar
                    </button>
                    <button onClick={() => onManageClasses(ciclo)} className="text-purple-600 hover:underline">
                      Gerir Turmas
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">Nenhum ciclo formativo encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CiclosFormativosManager;