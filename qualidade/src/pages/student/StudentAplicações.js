// src/pages/student/StudentAplicações.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStudentAplications } from '../../services/api';

const StudentAplicações = () => {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAplicacoes = async () => {
      try {
        const data = await getStudentAplications();
        setAplicacoes(data);
      } catch (err) {
        setError('Não foi possível carregar as aplicações.');
      } finally {
        setLoading(false);
      }
    };

    fetchAplicacoes();
  }, []);

  if (loading) {
    return <div className="p-6">A carregar...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Minhas Aplicações</h1>
      
      <div className="space-y-4">
        {aplicacoes.length === 0 ? (
          <p>Não tem questionários para responder.</p>
        ) : (
          aplicacoes.map(app => (
            <div key={app.id} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold">{app.titulo}</h2>
              <p className="text-sm text-gray-500">{app.descricao}</p>
              <div className="mt-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  app.estado === 'pendente' ? 'bg-yellow-200 text-yellow-800' :
                  app.estado === 'respondido' ? 'bg-green-200 text-green-800' :
                  'bg-gray-200 text-gray-800'
                }`}>
                  {app.estado}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                {app.estado === 'pendente' && (
                  <Link 
                    to={`/student/responder/${app.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Responder
                  </Link>
                )}
                {app.estado === 'respondido' && (
                    <button 
                        className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
                        disabled
                    >
                        Respondido
                    </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentAplicações;