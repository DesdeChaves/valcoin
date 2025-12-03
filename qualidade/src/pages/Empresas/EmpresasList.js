import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEmpresas, deleteEmpresa } from '../../services/api';
import useAuth from '../../hooks/useAuth'; // Assuming useAuth provides user info and roles

function EmpresasList() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth(); // Get user info from auth hook
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        setLoading(true);
        const data = await getEmpresas();
        setEmpresas(data);
      } catch (err) {
        setError('Failed to fetch companies. Please try again.');
        console.error('Error fetching companies:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await deleteEmpresa(id);
        setEmpresas(empresas.filter((empresa) => empresa.id !== id));
      } catch (err) {
        setError('Failed to delete company. Check your permissions.');
        console.error('Error deleting company:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading companies...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  // Check if user is authorized (Admin or Professor)
  const isAuthorized = user && (user.tipo_utilizador === 'ADMIN' || user.tipo_utilizador === 'PROFESSOR');

  if (!isAuthorized) {
    return <div className="text-center py-4 text-red-500">You are not authorized to view this page.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Company Management</h1>
      <div className="flex justify-end mb-4">
        <Link
          to="/empresas/create"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Adicionar Nova Empresa
        </Link>
      </div>

      {empresas.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
          Nenhuma empresa encontrada.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Nome</th>
                <th className="py-3 px-6 text-left">NIF</th>
                <th className="py-3 px-6 text-left">Email de Contacto</th>
                <th className="py-3 px-6 text-center">Tipo de Parceria</th>
                <th className="py-3 px-6 text-center">Ativo</th>
                <th className="py-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm">
              {empresas.map((empresa) => (
                <tr key={empresa.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{empresa.nome}</td>
                  <td className="py-3 px-6 text-left">{empresa.nif}</td>
                  <td className="py-3 px-6 text-left">{empresa.email_contacto}</td>
                  <td className="py-3 px-6 text-center">{empresa.tipos_parceria_nomes ? empresa.tipos_parceria_nomes.join(', ') : 'N/A'}</td>
                  <td className="py-3 px-6 text-center">
                    {empresa.ativo ? (
                      <span className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight">
                        <span aria-hidden="true" className="absolute inset-0 bg-green-200 opacity-50 rounded-full"></span>
                        <span className="relative">Sim</span>
                      </span>
                    ) : (
                      <span className="relative inline-block px-3 py-1 font-semibold text-red-900 leading-tight">
                        <span aria-hidden="true" className="absolute inset-0 bg-red-200 opacity-50 rounded-full"></span>
                        <span className="relative">Não</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex item-center justify-center space-x-2">
                      <Link
                        to={`/empresas/${empresa.id}`}
                        className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                        title="Ver Detalhes"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <Link
                        to={`/empresas/edit/${empresa.id}`}
                        className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                        title="Editar Empresa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(empresa.id)}
                        className="w-4 mr-2 transform hover:text-purple-500 hover:scale-110"
                        title="Apagar Empresa"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EmpresasList;