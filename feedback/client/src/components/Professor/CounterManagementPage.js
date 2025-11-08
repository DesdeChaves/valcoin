import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal';
import CounterForm from './CounterForm';

function CounterManagementPage() {
  const { dossieId } = useParams();
  const [counters, setCounters] = useState([]);
  const [dossie, setDossie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCounter, setSelectedCounter] = useState(null);
  const navigate = useNavigate();

  const fetchCounters = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      // Fetch dossier details to display its name
      const dossieResponse = await axios.get(`http://localhost:3002/api/dossiers/${dossieId}/pesquisa`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDossie(dossieResponse.data.dossie);

      const countersResponse = await axios.get(`http://localhost:3002/api/dossie/${dossieId}/contadores/resumo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setCounters(countersResponse.data.contadores);
    } catch (err) {
      setError('Erro ao carregar contadores.');
      console.error('Error fetching counters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounters();
  }, [dossieId, navigate]);

  const handleOpenModal = (counter) => {
    setSelectedCounter(counter);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCounter(null);
    setIsModalOpen(false);
  };

  const handleSave = () => {
    handleCloseModal();
    fetchCounters();
  };

  const handleDelete = async (counterId) => {
    if (window.confirm('Tem a certeza que quer apagar este contador?')) {
      const token = localStorage.getItem('token');
      try {
        await axios.get(`http://localhost:3002/api/contador/${counterId}/delete`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchCounters();
      } catch (err) {
        setError('Erro ao apagar contador.');
        console.error('Error deleting counter:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading counters...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Contadores do Dossiê: {dossie?.nome}</h2>
      <button
        onClick={() => handleOpenModal(null)}
        className="mb-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Adicionar Novo Contador
      </button>
      {counters.length === 0 ? (
        <p>Nenhum contador encontrado para este dossiê.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {counters.map((counter) => (
            <div key={counter.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold">{counter.shortname} ({counter.tipo})</h3>
              <p className="text-gray-600">Descrição: {counter.descritor}</p>
              <p className="text-gray-600">Incremento: {counter.incremento}</p>
              <div className="mt-4">
                <button
                  onClick={() => handleOpenModal(counter)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(counter.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => navigate(-1)}
        className="mt-6 ml-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
      >
        Voltar aos Dossiês
      </button>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedCounter ? 'Editar Contador' : 'Criar Novo Contador'}>
        <CounterForm counter={selectedCounter} dossieId={dossieId} onSave={handleSave} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
}

export default CounterManagementPage;