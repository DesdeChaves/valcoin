import React, { useState, useEffect } from 'react';
import { getProfessors, updateUserRoles } from '../services/api';

const Coordenadores = () => {
  const [professors, setProfessors] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfessors = async () => {
    try {
      setLoading(true);
      const data = await getProfessors();
      setProfessors(data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch professors:', error);
      setError('Falha ao carregar os professores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessors();
  }, []);

  const handleRoleToggle = async (professor) => {
    const roleName = 'coordenador_cursos_profissionais';
    const hasRole = professor.roles && professor.roles.includes(roleName);
    
    // Create a new roles array
    let updatedRoles;
    if (hasRole) {
      // Remove the role
      updatedRoles = professor.roles.filter(role => role !== roleName);
    } else {
      // Add the role
      updatedRoles = [...(professor.roles || []).filter(r => r), roleName];
    }

    try {
      // API call
      await updateUserRoles(professor.id, updatedRoles);
      
      // Refetch the data to get the latest state
      fetchProfessors(); 

    } catch (error) {
      console.error('Failed to update professor role:', error);
      alert('Falha ao atualizar a função do professor.');
    }
  };

  if (loading) {
    return <div>A carregar...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-4">Gerir Coordenadores de Cursos Profissionais</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome do Professor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordenador
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {professors.map((prof) => (
              <tr key={prof.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {prof.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prof.roles && prof.roles.includes('coordenador_cursos_profissionais') ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Sim
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Não
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleRoleToggle(prof)}
                    className={`px-4 py-2 rounded-md text-white ${
                      prof.roles && prof.roles.includes('coordenador_cursos_profissionais')
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {prof.roles && prof.roles.includes('coordenador_cursos_profissionais')
                      ? 'Remover Função'
                      : 'Atribuir Função'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Coordenadores;
