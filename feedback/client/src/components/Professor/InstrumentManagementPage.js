import React, { useEffect, useState } from 'react';
import { fetchCriterionDetails, fetchInstrumentsByCriterion, deleteInstrument } from '../../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal';
import InstrumentForm from './InstrumentForm';

function InstrumentManagementPage() {
  const { criterioId } = useParams();
  const [instruments, setInstruments] = useState([]);
  const [criterion, setCriterion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const navigate = useNavigate();
  const professorId = JSON.parse(localStorage.getItem('user'))?.id;

  const fetchInstruments = async () => {
    try {
      // Fetch criterion details to display its name
      const criterionResponse = await fetchCriterionDetails(criterioId);
      setCriterion(criterionResponse.data);

      const instrumentsResponse = await fetchInstrumentsByCriterion(criterioId);
      setInstruments(instrumentsResponse.data);
    } catch (err) {
      setError('Erro ao carregar instrumentos.');
      console.error('Error fetching instruments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstruments();
  }, [criterioId, navigate]);

  const handleOpenModal = (instrument) => {
    setSelectedInstrument(instrument);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedInstrument(null);
    setIsModalOpen(false);
  };

  const handleSave = () => {
    handleCloseModal();
    fetchInstruments();
  };

  const handleDelete = async (instrumentId) => {
    if (window.confirm('Tem a certeza que quer apagar este instrumento?')) {
      try {
        await deleteInstrument(instrumentId);
        fetchInstruments();
      } catch (err) {
        setError('Erro ao apagar instrumento.');
        console.error('Error deleting instrument:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading instruments...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Instrumentos do Critério: {criterion?.nome}</h2>
      <button
        onClick={() => handleOpenModal(null)}
        className="mb-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Adicionar Novo Instrumento
      </button>
      {instruments.length === 0 ? (
        <p>Nenhum instrumento encontrado para este critério.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instruments.map((instrument) => (
            <div key={instrument.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold">{instrument.nome}</h3>
              <p className="text-gray-600">Tipo: {instrument.tipo}</p>
              <p className="text-gray-600">Ponderação: {instrument.ponderacao}%</p>
              <p className="text-gray-600">Cotação Máxima: {instrument.cotacao_maxima}</p>
              <div className="mt-4">
                <button
                  onClick={() => navigate(`/professor/instrument/${instrument.id}/grades`)}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Notas
                </button>
                <button
                  onClick={() => handleOpenModal(instrument)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(instrument.id)}
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
        Voltar aos Critérios
      </button>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedInstrument ? 'Editar Instrumento' : 'Criar Novo Instrumento'}>
        <InstrumentForm instrument={selectedInstrument} criterioId={criterioId} professorId={professorId} onSave={handleSave} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
}

export default InstrumentManagementPage;