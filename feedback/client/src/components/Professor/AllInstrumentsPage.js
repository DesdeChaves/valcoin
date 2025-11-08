import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AllInstrumentsPage() {
  const [instrumentsByCriterion, setInstrumentsByCriterion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllInstruments = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await axios.get(`http://localhost:3002/api/users/${user.id}/instruments/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setInstrumentsByCriterion(response.data);
      } catch (err) {
        setError('Erro ao carregar instrumentos.');
        console.error('Error fetching all instruments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllInstruments();
  }, [navigate]);

  if (loading) {
    return <div className="text-center mt-8">Loading instruments...</div>;
  }

  if (error) {
    return <div className="text-center mt-8 text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Todos os Instrumentos</h2>
      {instrumentsByCriterion.length === 0 ? (
        <p>Nenhum instrumento encontrado.</p>
      ) : (
        instrumentsByCriterion.map((criterion) => (
          <div key={criterion.id} className="mb-8">
            <h3 className="text-xl font-semibold mb-4">{criterion.nome}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criterion.instrumentos.map((instrument) => (
                <div key={instrument.id} className="bg-white p-4 rounded-lg shadow">
                  <h4 className="text-lg font-semibold">{instrument.nome}</h4>
                  <p className="text-gray-600">Tipo: {instrument.tipo}</p>
                  <p className="text-gray-600">Ponderação: {instrument.ponderacao}%</p>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate(`/professor/instrument/${instrument.id}/grades`)}
                      className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                      Gerir Instrumento
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

export default AllInstrumentsPage;
