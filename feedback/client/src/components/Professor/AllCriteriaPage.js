import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AllCriteriaPage() {
  const [criteriaByDossier, setCriteriaByDossier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllCriteria = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await axios.get(`http://localhost:3002/api/users/${user.id}/criteria/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setCriteriaByDossier(response.data);
      } catch (err) {
        setError('Erro ao carregar critérios.');
        console.error('Error fetching all criteria:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllCriteria();
  }, [navigate]);

  if (loading) {
    return <div className="text-center mt-8">Loading criteria...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Todos os Critérios</h2>
      {criteriaByDossier.length === 0 ? (
        <p>Nenhum critério encontrado.</p>
      ) : (
        criteriaByDossier.map((dossier) => (
          <div key={dossier.id} className="mb-8">
            <h3 className="text-xl font-semibold mb-4">{dossier.nome}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dossier.criterios.map((criterion) => (
                <div key={criterion.id} className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold">{criterion.nome}</h4>
                  <p className="text-gray-600">Ponderação: {criterion.ponderacao}%</p>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate(`/professor/criterio/${criterion.id}/instruments`)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Gerir Critério
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

export default AllCriteriaPage;
