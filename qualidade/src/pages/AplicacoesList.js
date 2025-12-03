// src/pages/AplicacoesList.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAplicacoes } from '../services/api';
import useAuth from '../hooks/useAuth';

const AplicacoesList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [aplicacoes, setAplicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const carregarAplicacoes = async () => {
      try {
        const data = await getAplicacoes();
        setAplicacoes(data);
      } catch (err) {
        console.error('Erro ao carregar aplicações:', err);
        setError('Não foi possível carregar as aplicações. Tenta novamente.');
      } finally {
        setLoading(false);
      }
    };

    carregarAplicacoes();
  }, []);

  const formatarData = (data) => {
    if (!data) return '—';
    return new Date(data).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoCor = (estado) => {
    switch (estado) {
      case 'aberto': return 'bg-green-100 text-green-800';
      case 'fechado': return 'bg-red-100 text-red-800';
      case 'agendado': return 'bg-yellow-100 text-yellow-800';
      case 'inativo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-gray-600">A carregar aplicações...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minhas Aplicações de Questionário</h1>
          <p className="text-gray-600 mt-1">Gerir questionários aplicados a turmas, professores ou outros</p>
        </div>
        <Link
          to="/qualidade/criar"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Aplicação
        </Link>
      </div>

      {/* Lista vazia */}
      {aplicacoes.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-24 h-24 mx-auto mb-6" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Ainda não criaste nenhuma aplicação</h3>
          <p className="text-gray-600 mb-6">Clica em "Nova Aplicação" para começar</p>
          <Link
            to="/qualidade/criar"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
          >
            Criar primeira aplicação
          </Link>
        </div>
      ) : (
        /* Grid de aplicações */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {aplicacoes.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                {/* Título */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  {app.titulo_customizado || app.questionario_titulo || 'Sem título'}
                </h3>

                {/* Informações */}
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                    <span><strong>Criador:</strong> {app.aplicador_nome || user.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span><strong>Tipo:</strong> {app.tipo_aplicacao?.replace(/_/g, ' ') || 'Não definido'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                    </svg>
                    <span><strong>Abertura:</strong> {formatarData(app.data_abertura)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" />
                    </svg>
                    <span><strong>Fecho:</strong> {formatarData(app.data_fecho) || 'Sem data'}</span>
                  </div>
                </div>

                {/* Estatísticas */}
                <div className="flex justify-between items-center mb-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{app.total_respostas || 0}</p>
                    <p className="text-xs text-gray-500">Respostas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{app.total_destinatarios || 0}</p>
                    <p className="text-xs text-gray-500">Destinatários</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {app.total_destinatarios > 0 
                        ? Math.round(((app.total_respostas || 0) / app.total_destinatarios) * 100) 
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Taxa</p>
                  </div>
                </div>

                {/* Estado */}
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${getEstadoCor(app.estado)}`}>
                  {app.estado ? app.estado.charAt(0).toUpperCase() + app.estado.slice(1) : 'Desconhecido'}
                </div>

                {/* Ações */}
                <div className="flex gap-3">
                  <Link
                    to={`/qualidade/editar/${app.id}`}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    Editar
                  </Link>
                  <Link
                    to={`/qualidade/respostas/${app.id}`}
                    className="flex-1 text-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    Ver Respostas
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AplicacoesList;
