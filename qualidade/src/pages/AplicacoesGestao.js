// src/pages/AplicacoesGestao.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAplicacoes, deleteAplicacao } from '../services/api';

const AplicacoesGestao = () => {
  const [aplicacoes, setAplicacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAplicacoes();
        setAplicacoes(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id, titulo) => {
    if (window.confirm(`Tem a certeza que quer apagar a aplicação "${titulo}"?`)) {
      try {
        await deleteAplicacao(id);
        setAplicacoes(prev => prev.filter(a => a.id !== id));
      } catch (err) {
        console.error(err);
        alert('Erro ao apagar a aplicação.');
      }
    }
  };

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calcularTaxa = (total, respostas) => {
    if (!total) return 0;
    return Math.round((respostas / total) * 100);
  };

  const getEstadoBadge = (estado) => {
    const cores = {
      aberto: 'bg-green-100 text-green-800',
      fechado: 'bg-red-100 text-red-800',
      agendado: 'bg-yellow-100 text-yellow-800',
      inativo: 'bg-gray-100 text-gray-700'
    };
    return `px-4 py-2 rounded-full text-sm font-bold ${cores[estado] || 'bg-gray-100 text-gray-600'}`;
  };

  if (loading) return <div className="p-20 text-center text-2xl">A carregar aplicações...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3">
              As Minhas Aplicações
            </h1>
            <p className="text-xl text-gray-600">
              Questionários que já aplicaste a turmas, professores ou outros
            </p>
          </div>
          <Link
            to="/aplicacoes/criar"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-6 rounded-2xl text-2xl font-bold shadow-2xl hover:shadow-3xl transition transform hover:scale-105 flex items-center gap-center gap-4"
          >
            + Nova Aplicação
          </Link>
        </div>

        {/* Lista vazia */}
        {aplicacoes.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl shadow-xl">
            <div className="text-8xl mb-8">No applications yet</div>
            <p className="text-2xl text-gray-600 mb-10">
              Ainda não aplicaste nenhum questionário
            </p>
            <Link
              to="/aplicacoes/criar"
              className="bg-indigo-600 text-white px-12 py-6 rounded-2xl text-xl font-bold hover:bg-indigo-700 transition"
            >
              Criar a primeira aplicação
            </Link>
          </div>
        ) : (
          /* Grid de aplicações */
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {aplicacoes.map(app => (
              <div key={app.id} className="bg-white rounded-3xl shadow-2xl hover:shadow-3xl transition overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white">
                  <h3 className="text-2xl font-bold mb-3 line-clamp-2">
                    {app.titulo_customizado || app.questionario_titulo}
                  </h3>
                  <div className="flex items-center gap-3 gap-4 text-indigo-100">
                    <span className="text-sm">{app.tipo_aplicacao.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span className="text-sm capitalize">{app.publico_alvo}</span>
                  </div>
                </div>

                <div className="p-8">
                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                    <div>
                      <p className="text-4xl font-bold text-gray-900">{app.total_respostas || 0}</p>
                      <p className="text-sm text-gray-600">Respostas</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-gray-900">{app.total_destinatarios || 0}</p>
                      <p className="text-sm text-gray-600">Destinatários</p>
                    </div>
                    <div>
                      <p className="text-4xl font-bold text-purple-600">
                        {calcularTaxa(app.total_destinatarios, app.total_respostas)}%
                      </p>
                      <p className="text-sm text-gray-600">Taxa</p>
                    </div>
                  </div>

                  {/* Datas */}
                  <div className="space-y-3 text-sm mb-8">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Abertura:</span>
                      <span className="font-medium">{formatarData(app.data_abertura)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecho:</span>
                      <span className="font-medium">{formatarData(app.data_fecho) || 'Sem data'}</span>
                    </div>
                  </div>

                  {/* Estado */}
                  <div className="mb-8 text-center">
                    <span className={getEstadoBadge(app.estado)}>
                      {app.estado?.toUpperCase() || 'DESCONHECIDO'}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="grid grid-cols-3 gap-4">
                    {app.tipo_aplicacao === 'link_aberto' && app.token_acesso && (
                      <button
                        onClick={() => {
                          const publicLink = `${window.location.origin}/qualidade/responder/${app.token_acesso}`;
                          navigator.clipboard.writeText(publicLink)
                            .then(() => alert('Link público copiado para a área de transferência!'))
                            .catch(err => console.error('Erro ao copiar link:', err));
                        }}
                        className="text-center bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold transition col-span-1"
                      >
                        Copiar Link Público
                      </button>
                    )}
                    <Link
                      to={`/aplicacoes/editar/${app.id}`}
                      className="text-center bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition"
                    >
                      Editar
                    </Link>
                    <Link
                      to={`/aplicacoes/resultados/${app.id}`}
                      className="text-center bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold transition"
                    >
                      Ver Resultados
                    </Link>
                    <button
                        onClick={() => handleDelete(app.id, app.titulo_customizado || app.questionario_titulo)}
                        className="text-center bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-bold transition"
                    >
                        Apagar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AplicacoesGestao;
