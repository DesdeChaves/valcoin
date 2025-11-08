import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AllDossiersPage() {
  const [dossiersByDiscipline, setDossiersByDiscipline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllDossiers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await axios.get(`http://localhost:3002/api/users/${user.id}/dossiers/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setDossiersByDiscipline(response.data);
      } catch (err) {
        setError('Erro ao carregar dossiês.');
        console.error('Error fetching all dossiers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDossiers();
  }, [navigate]);

  if (loading) {
    return <div className="text-center mt-8">Loading dossiers...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Todos os Dossiês</h2>
      {dossiersByDiscipline.length === 0 ? (
        <p>Nenhum dossiê encontrado.</p>
      ) : (
        dossiersByDiscipline.map((discipline) => (
          <div key={discipline.professor_disciplina_turma_id} className="mb-8">
            <h3 className="text-xl font-semibold mb-4">{discipline.subject_name} - {discipline.class_name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discipline.dossiers.map((dossier) => (
                <div key={dossier.id} className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold">{dossier.nome}</h4>
                  <p className="text-gray-600">{dossier.descricao}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate(`/professor/dossier/${dossier.id}/criteria`)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Gerir Dossiê
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AllDossiersPage;
