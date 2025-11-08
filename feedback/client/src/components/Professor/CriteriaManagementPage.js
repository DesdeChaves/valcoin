import React, { useEffect, useState } from 'react';
import { fetchCriteriaByDossier, deleteCriterion } from '../../utils/api';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal';
import CriterionForm from './CriterionForm';

function CriteriaManagementPage() {
  const { dossieId } = useParams();
  const [criteria, setCriteria] = useState([]);
  const [dossie, setDossie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const navigate = useNavigate();
  const professorId = JSON.parse(localStorage.getItem('user'))?.id;

  const fetchCriteria = async () => {
    try {
      const response = await fetchCriteriaByDossier(dossieId);
      setDossie(response.data.dossie);
      setCriteria(response.data.criterios);
    } catch (err) {
      setError('Erro ao carregar critérios.');
      console.error('Error fetching criteria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, [dossieId, navigate]);

  const handleOpenModal = (criterion) => {
    setSelectedCriterion(criterion);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedCriterion(null);
    setIsModalOpen(false);
  };

  const handleSave = () => {
    handleCloseModal();
    fetchCriteria();
  };

  const handleDelete = async (criterionId) => {
    if (window.confirm('Tem a certeza que quer apagar este critério?')) {
      try {
        await deleteCriterion(criterionId);
        fetchCriteria();
      } catch (err) {
        setError('Erro ao apagar critério.');
        console.error('Error deleting criterion:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading criteria...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Critérios do Dossiê: {dossie?.nome}</h2>
      <button
        onClick={() => handleOpenModal(null)}
        className="mb-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Adicionar Novo Critério
      </button>
      {criteria.length === 0 ? (
        <p>Nenhum critério encontrado para este dossiê.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {criteria.map((criterion) => (
            <div key={criterion.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold">{criterion.nome}</h3>
              <p className="text-gray-600">Ponderação: {criterion.ponderacao}%</p>
              <p className="text-gray-600">Descrição: {criterion.descricao}</p>
              <div className="mt-4">
                <button
                  onClick={() => navigate(`/professor/criterio/${criterion.id}/instruments`)}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Instrumentos
                </button>
                <button
                  onClick={() => handleOpenModal(criterion)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(criterion.id)}
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
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedCriterion ? 'Editar Critério' : 'Criar Novo Critério'}>
        <CriterionForm criterion={selectedCriterion} dossieId={dossieId} professorId={professorId} onSave={handleSave} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
}

export default CriteriaManagementPage;