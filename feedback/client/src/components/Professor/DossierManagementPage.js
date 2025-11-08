import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Modal from '../Layout/Modal';
import DossierForm from './DossierForm';

function DossierManagementPage() {
  const { professorDisciplinaTurmaId } = useParams();
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const navigate = useNavigate();

  const fetchDossiers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:3002/api/dossies/${professorDisciplinaTurmaId}/pesquisa`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setDossiers(response.data.dossies);
    } catch (err) {
      setError('Erro ao carregar dossiês.');
      console.error('Error fetching dossiers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossiers();
  }, [professorDisciplinaTurmaId, navigate]);

  const handleOpenModal = (dossier) => {
    setSelectedDossier(dossier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedDossier(null);
    setIsModalOpen(false);
  };

  const handleSave = () => {
    handleCloseModal();
    fetchDossiers();
  };

  const handleDelete = async (dossierId) => {
    if (window.confirm('Tem a certeza que quer apagar este dossiê?')) {
      const token = localStorage.getItem('token');
      try {
        await axios.get(`http://localhost:3002/api/dossie/${dossierId}/delete`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchDossiers();
      } catch (err) {
        setError('Erro ao apagar dossiê.');
        console.error('Error deleting dossier:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center mt-8">Loading dossiers...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Dossiês da Disciplina</h2>
      <button
        onClick={() => handleOpenModal(null)}
        className="mb-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Criar Novo Dossiê
      </button>
      {dossiers.length === 0 ? (
        <p>Nenhum dossiê encontrado para esta disciplina.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dossiers.map((dossier) => (
            <div key={dossier.id} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold">{dossier.nome}</h3>
              <p className="text-gray-600">{dossier.descricao}</p>
              <p className="text-gray-600">Início: {new Date(dossier.data_inicio).toLocaleDateString()}</p>
              <p className="text-gray-600">Fim: {new Date(dossier.data_fim).toLocaleDateString()}</p>
              <div className="mt-4">
                <button
                  onClick={() => navigate(`/professor/dossier/${dossier.id}/criteria`)}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Critérios
                </button>
                <button
                  onClick={() => handleOpenModal(dossier)}
                  className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded mr-2"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(dossier.id)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  Apagar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedDossier ? 'Editar Dossiê' : 'Criar Novo Dossiê'}>
        <DossierForm dossier={selectedDossier} onSave={handleSave} onCancel={handleCloseModal} professorDisciplinaTurmaId={professorDisciplinaTurmaId} />
      </Modal>
    </div>
  );
}

export default DossierManagementPage;