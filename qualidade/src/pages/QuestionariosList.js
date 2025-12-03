// src/pages/QuestionariosList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAplicacoes } from '../services/api';

const QuestionariosList = () => {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAplicacoes()
      .then(setAplicacoes)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center">A carregar...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">As Minhas Aplicações de Questionário</h1>
        <Link
          to="criar"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          + Nova Aplicação
        </Link>
      </div>

      {aplicacoes.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <p className="text-xl text-gray-600">Ainda não aplicaste nenhum questionário.</p>
          <Link to="criar" className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg">
            Criar a primeira aplicação
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {aplicacoes.map(app => (
            <div key={app.id} className="bg-white rounded-xl shadow hover:shadow-lg p-6 border">
              <h3 className="text-xl font-bold mb-2">
                {app.titulo_customizado || app.questionario_titulo}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {app.tipo_aplicacao.replace(/_/g, ' ')} • {app.publico_alvo}
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-green-600 font-medium">
                  {app.total_respostas || 0} respostas
                </span>
                <span className="text-gray-500">
                  {app.total_destinatarios || 0} destinatários
                </span>
              </div>
              <div className="mt-4 flex gap-3">
                <Link
                  to={`editar/${app.id}`}
                  className="flex-1 text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Editar
                </Link>
                <Link
                  to={`resultados/${app.id}`}
                  className="flex-1 text-center bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  Resultados
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionariosList;
