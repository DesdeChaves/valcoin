// src/pages/AplicacoesList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAplicacoes } from '../services/api';
import useAuth from '../hooks/useAuth';

const AplicacoesList = () => {
  const { user } = useAuth();
  const [aplicacoes, setAplicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAplicacoes();
        setAplicacoes(data);
      } catch (err) {
        setError('Erro ao carregar aplicações');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-8 text-center">A carregar...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Minhas Aplicações</h1>
        <Link
          to="forms/new"
          className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
        >
          + Nova Aplicação
        </Link>
      </div>

      {aplicacoes.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          Ainda não criaste nenhuma aplicação.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {aplicacoes.map(app => (
            <div key={app.id} className="bg-white shadow rounded-lg p-6 border">
              <h3 className="text-xl font-semibold mb-2">
                {app.titulo_customizado || app.questionario_titulo || 'Sem título'}
              </h3>
              <p className="text-gray-600 mb-1">
                <strong>Criador:</strong> {app.aplicador_nome || user.nome}
              </p>
              <p className="text-gray-600 mb-1">
                <strong>Tipo:</strong> {app.tipo_aplicacao.replace('_', ' ')}
              </p>
              <p className="text-gray-600 mb-3">
                <strong>Estado:</strong>{' '}
                <span className={`font-medium ${
                  app.estado === 'aberto' ? 'text-green-600' :
                  app.estado === 'fechado' ? 'text-red-600' :
                  'text-orange-600'
                }`}>
                  {app.estado || 'desconhecido'}
                </span>
              </p>
              <div className="flex gap-3">
                <Link
                  to={`forms/${app.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  Editar
                </Link>
                <Link
                  to={`forms/${app.id}/responses`}
                  className="text-green-600 hover:underline"
                >
                  Ver respostas ({app.total_respostas || 0})
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AplicacoesList;
