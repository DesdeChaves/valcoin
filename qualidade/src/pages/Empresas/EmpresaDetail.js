import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEmpresaById } from '../../services/api';
import useAuth from '../../hooks/useAuth'; // Assuming useAuth provides user info and roles

function EmpresaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // Get user info from auth hook

  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

      useEffect(() => {
          if (authLoading) return; // Wait until authentication state is resolved
  
          // Check if user is authorized (Admin or Professor)
          if (!user || (user.tipo_utilizador !== 'ADMIN' && user.tipo_utilizador !== 'PROFESSOR')) {
              navigate('/qualidade'); // Redirect to dashboard or unauthorized page
              return;
          }
  
          const fetchEmpresa = async () => {
              try {
                  setLoading(true); // This local loading state is for fetching company data
                  const data = await getEmpresaById(id);
                  setEmpresa(data);
              } catch (err) {
                  setError('Failed to fetch company details. Please check the ID or your permissions.');
                  console.error('Error fetching company details:', err);
              } finally {
                  setLoading(false);
              }
          };
  
          fetchEmpresa();
      }, [id, user, navigate, authLoading]);
  if (authLoading) {
    return <div className="text-center py-4">Loading authentication...</div>;
  }

  if (loading) {
    return <div className="text-center py-4">Loading company details...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (!empresa) {
    return <div className="text-center py-4 text-gray-600">Company not found.</div>;
  }

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT'); // Adjust locale as needed
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Company Details: {empresa.nome}</h1>
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600"><strong>Short Name:</strong> {empresa.nome_curto || 'N/A'}</p>
            <p className="text-gray-600"><strong>NIF:</strong> {empresa.nif || 'N/A'}</p>
            <p className="text-gray-600"><strong>Contact Email:</strong> {empresa.email_contacto || 'N/A'}</p>
            <p className="text-gray-600"><strong>Phone:</strong> {empresa.telefone || 'N/A'}</p>
            <p className="text-gray-600"><strong>Contact Person:</strong> {empresa.pessoa_contacto || 'N/A'}</p>
            <p className="text-gray-600"><strong>Partnership Type(s):</strong>{' '}
              {empresa.tipos_parceria && empresa.tipos_parceria.length > 0
                ? empresa.tipos_parceria.map(tipo => tipo.nome).join(', ')
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-gray-600"><strong>Addresses:</strong></p>
            {empresa.enderecos && empresa.enderecos.length > 0 ? (
              empresa.enderecos.map((endereco, index) => (
                <div key={endereco.id || index} className="ml-4 mb-2 p-2 border rounded-md bg-gray-50">
                  <p className="text-gray-600"><strong>Morada:</strong> {endereco.morada || 'N/A'}</p>
                  <p className="text-gray-600"><strong>Código Postal:</strong> {endereco.codigo_postal || 'N/A'}</p>
                  <p className="text-gray-600"><strong>Localidade:</strong> {endereco.localidade || 'N/A'}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-600 ml-4">N/A</p>
            )}
            <p className="text-gray-600"><strong>Active:</strong> {empresa.ativo ? 'Yes' : 'No'}</p>
            <p className="text-gray-600"><strong>Partnership Start:</strong> {formatDate(empresa.data_inicio_parceria)}</p>
            <p className="text-gray-600"><strong>Partnership End:</strong> {formatDate(empresa.data_fim_parceria)}</p>
            <p className="text-gray-600"><strong>Created At:</strong> {formatDate(empresa.data_criacao)}</p>
            <p className="text-gray-600"><strong>Last Updated:</strong> {formatDate(empresa.data_atualizacao)}</p>
            <p className="text-gray-600"><strong>Creator Internal ID:</strong> {empresa.criador_interno || 'N/A'}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-4">
        <Link
          to={`edit/${empresa.id}`}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Edit Company
        </Link>
        <button
          onClick={() => navigate('/empresas')}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          Back to List
        </button>
      </div>
    </div>
  );
}

export default EmpresaDetail;