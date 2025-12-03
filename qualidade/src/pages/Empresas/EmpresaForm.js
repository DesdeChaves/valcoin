import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEmpresaById, createEmpresa, updateEmpresa, getTiposParceria } from '../../services/api';
import useAuth from '../../hooks/useAuth';

function EmpresaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // Renamed to authLoading

  const [formData, setFormData] = useState({
    nome: '',
    nome_curto: '',
    nif: '',
    enderecos: [{ morada: '', codigo_postal: '', localidade: '' }], // Changed to array of objects
    email_contacto: '',
    telefone: '',
    pessoa_contacto: '',
    tipo_parceria_id: '', // Changed to store ID
    ativo: true,
    data_inicio_parceria: '',
    data_fim_parceria: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tiposParceria, setTiposParceria] = useState([]); // New state for partnership types

  useEffect(() => {
    if (authLoading) return; // Wait until authentication state is resolved

    // Check if user is authorized (Admin or Professor)
    if (!user || (user.tipo_utilizador !== 'ADMIN' && user.tipo_utilizador !== 'PROFESSOR')) {
      navigate('/qualidade'); // Redirect to dashboard or unauthorized page
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [tiposData, empresaData] = await Promise.all([
          getTiposParceria(),
          id ? getEmpresaById(id) : Promise.resolve(null),
        ]);
        setTiposParceria(tiposData);

        if (empresaData) {
          // Format dates for input fields
          if (empresaData.data_inicio_parceria) empresaData.data_inicio_parceria = empresaData.data_inicio_parceria.split('T')[0];
          if (empresaData.data_fim_parceria) empresaData.data_fim_parceria = empresaData.data_fim_parceria.split('T')[0];

          // Handle addresses: convert single fields to array if needed
          let formattedEnderecos = [];
          if (empresaData.enderecos && Array.isArray(empresaData.enderecos)) {
            formattedEnderecos = empresaData.enderecos;
          } else if (empresaData.morada || empresaData.codigo_postal || empresaData.localidade) {
            formattedEnderecos = [{
              morada: empresaData.morada || '',
              codigo_postal: empresaData.codigo_postal || '',
              localidade: empresaData.localidade || '',
            }];
          } else {
            formattedEnderecos = [{ morada: '', codigo_postal: '', localidade: '' }];
          }

          setFormData({
            ...empresaData,
            enderecos: formattedEnderecos,
            tipo_parceria_id: empresaData.tipo_parceria?.id || '', // Extract ID if object
          });
        }
      } catch (err) {
        setError('Failed to fetch initial data.');
        console.error('Error fetching initial data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [id, user, navigate, authLoading]); // Changed loading to authLoading

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEnderecoChange = (index, e) => {
    const { name, value } = e.target;
    const newEnderecos = [...formData.enderecos];
    newEnderecos[index] = {
      ...newEnderecos[index],
      [name]: value,
    };
    setFormData((prevData) => ({
      ...prevData,
      enderecos: newEnderecos,
    }));
  };

  const addEndereco = () => {
    setFormData((prevData) => ({
      ...prevData,
      enderecos: [...prevData.enderecos, { morada: '', codigo_postal: '', localidade: '' }],
    }));
  };

  const removeEndereco = (index) => {
    setFormData((prevData) => ({
      ...prevData,
      enderecos: prevData.enderecos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare data for submission, removing any empty addresses
      const dataToSubmit = {
        ...formData,
        enderecos: formData.enderecos.filter(addr => addr.morada || addr.codigo_postal || addr.localidade)
      };

      if (id) {
        // Update existing company
        await updateEmpresa(id, dataToSubmit);
        setSuccess('Company updated successfully!');
      } else {
        // Create new company
        await createEmpresa(dataToSubmit);
        setSuccess('Company created successfully!');
        // Optionally clear form or navigate
        setFormData({
          nome: '', nome_curto: '', nif: '', enderecos: [{ morada: '', codigo_postal: '', localidade: '' }],
          email_contacto: '', telefone: '', pessoa_contacto: '', tipo_parceria_id: '',
          ativo: true, data_inicio_parceria: '', data_fim_parceria: '',
        });
      }
      navigate('/empresas'); // Redirect to list after success
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
      console.error('Error submitting form:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading only while checking authentication
  if (authLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  // Show loading when fetching existing company data
  if (loading && id) {
    return <div className="text-center py-4">Loading company data...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">{id ? 'Edit Company' : 'Add New Company'}</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">{success}</div>}

        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Company Name</label>
          <input
            type="text"
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="nome_curto" className="block text-sm font-medium text-gray-700">Short Name</label>
          <input
            type="text"
            id="nome_curto"
            name="nome_curto"
            value={formData.nome_curto}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="nif" className="block text-sm font-medium text-gray-700">NIF</label>
          <input
            type="text"
            id="nif"
            name="nif"
            value={formData.nif}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="email_contacto" className="block text-sm font-medium text-gray-700">Contact Email</label>
          <input
            type="email"
            id="email_contacto"
            name="email_contacto"
            value={formData.email_contacto}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            type="text"
            id="telefone"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="pessoa_contacto" className="block text-sm font-medium text-gray-700">Contact Person</label>
          <input
            type="text"
            id="pessoa_contacto"
            name="pessoa_contacto"
            value={formData.pessoa_contacto}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="tipo_parceria_id" className="block text-sm font-medium text-gray-700">Partnership Type</label>
          <select
            id="tipo_parceria_id"
            name="tipo_parceria_id"
            value={formData.tipo_parceria_id}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Select a partnership type</option>
            {tiposParceria.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-xl font-bold mt-6 mb-4 text-gray-800">Addresses</h2>
        {formData.enderecos.map((endereco, index) => (
          <div key={index} className="border p-4 rounded-md shadow-sm mb-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Address {index + 1}</h3>
              {formData.enderecos.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEndereco(index)}
                  className="text-red-600 hover:text-red-800 font-bold py-1 px-3 rounded-md bg-red-100 hover:bg-red-200 transition duration-150 ease-in-out"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="mb-3">
              <label htmlFor={`morada-${index}`} className="block text-sm font-medium text-gray-700">Address Line</label>
              <input
                type="text"
                id={`morada-${index}`}
                name="morada"
                value={endereco.morada}
                onChange={(e) => handleEnderecoChange(index, e)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div className="mb-3">
              <label htmlFor={`codigo_postal-${index}`} className="block text-sm font-medium text-gray-700">Postal Code</label>
              <input
                type="text"
                id={`codigo_postal-${index}`}
                name="codigo_postal"
                value={endereco.codigo_postal}
                onChange={(e) => handleEnderecoChange(index, e)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor={`localidade-${index}`} className="block text-sm font-medium text-gray-700">Locality</label>
              <input
                type="text"
                id={`localidade-${index}`}
                name="localidade"
                value={endereco.localidade}
                onChange={(e) => handleEnderecoChange(index, e)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addEndereco}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-6"
        >
          Add Address
        </button>

        <div>
          <label htmlFor="data_inicio_parceria" className="block text-sm font-medium text-gray-700">Partnership Start Date</label>
          <input
            type="date"
            id="data_inicio_parceria"
            name="data_inicio_parceria"
            value={formData.data_inicio_parceria}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="data_fim_parceria" className="block text-sm font-medium text-gray-700">Partnership End Date</label>
          <input
            type="date"
            id="data_fim_parceria"
            name="data_fim_parceria"
            value={formData.data_fim_parceria}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="ativo"
            name="ativo"
            checked={formData.ativo}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="ativo" className="ml-2 block text-sm text-gray-900">Active</label>
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => navigate('/empresas')}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Company'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EmpresaForm;
