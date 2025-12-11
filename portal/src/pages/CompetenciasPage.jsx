import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, Users, Award, CheckCircle, AlertTriangle, Layers, Target, Filter, ChevronDown, ChevronUp, TrendingDown, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getCompetenciasStats, fetchCompetenciasEvolucaoPorDisciplina } from '../services/api';

const TrendIcon = ({ trend }) => {
  if (trend > 0) return <TrendingUp className="w-5 h-5 text-green-500" />;
  if (trend < 0) return <TrendingDown className="w-5 h-5 text-red-500" />;
  return <ArrowRight className="w-5 h-5 text-gray-500" />;
};

const CompetenciaItem = ({ competencia }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const ultimoMomento = competencia.momentos[0];
  const penultimoMomento = competencia.momentos[1];
  const trend = penultimoMomento ? ultimoMomento.media_nivel - penultimoMomento.media_nivel : 0;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-6 text-left"
      >
        <h4 className="text-xl font-semibold text-gray-800">
          <span className="font-bold text-indigo-600">{competencia.competencia_codigo}</span> - {competencia.competencia_nome}
        </h4>
        {isExpanded ? (
          <ChevronUp className="w-6 h-6 text-indigo-600" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-500" />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Penúltimo Momento */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h5 className="text-sm font-bold text-gray-600 mb-2 truncate">{penultimoMomento ? penultimoMomento.momento_avaliacao : 'Sem dados anteriores'}</h5>
              {penultimoMomento ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-700">{penultimoMomento.media_nivel}</p>
                  <p className="text-xs text-gray-500">Média de Nível</p>
                  <p className="text-sm text-gray-600">{penultimoMomento.total_alunos_avaliados} alunos</p>
                </div>
              ) : <p className="text-gray-500 text-sm">N/A</p>}
            </div>

            {/* Último Momento */}
            <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
              <h5 className="text-sm font-bold text-blue-800 mb-2 truncate">{ultimoMomento.momento_avaliacao}</h5>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-blue-700">{ultimoMomento.media_nivel}</p>
                <p className="text-xs text-blue-600">Média de Nível</p>
                <p className="text-sm text-blue-700">{ultimoMomento.total_alunos_avaliados} alunos</p>
              </div>
            </div>

            {/* Evolução */}
            <div className="flex flex-col items-center justify-center bg-green-50 p-4 rounded-lg">
               <h5 className="text-sm font-bold text-green-800 mb-2">Evolução</h5>
               <div className="flex items-center gap-2">
                 <TrendIcon trend={trend} />
                 <p className={`text-2xl font-bold ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                   {trend.toFixed(2)}
                 </p>
               </div>
               <p className="text-xs text-gray-500 mt-1">na média de nível</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const DisciplinaEvolucaoView = ({ data, loading, error }) => {
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState('');

  // Filter disciplines with no competencies
  const availableDisciplinas = data ? data.filter(d => d.competencias && d.competencias.length > 0) : [];

  useEffect(() => {
    // Auto-select the first available discipline when data is loaded or if the selected one is no longer available
    if (availableDisciplinas.length > 0 && 
        (!selectedDisciplinaId || !availableDisciplinas.some(d => d.disciplina_id === selectedDisciplinaId))) {
      setSelectedDisciplinaId(availableDisciplinas[0].disciplina_id);
    } else if (availableDisciplinas.length === 0) {
      setSelectedDisciplinaId(''); // No disciplines to select
    }
  }, [availableDisciplinas, selectedDisciplinaId]);


  if (loading) {
    return (
      <div className="text-center py-8 text-xl text-gray-600">
        <BookOpen className="w-12 h-12 text-cyan-600 animate-pulse mx-auto mb-4" />
        A carregar evolução por disciplina...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-xl text-red-600">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        Erro ao carregar dados de evolução: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-xl text-gray-500">
        Não foram encontrados dados de evolução para as disciplinas.
      </div>
    );
  }

  // If after filtering, there are no available disciplines, show a message
  if (availableDisciplinas.length === 0) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-2xl text-center text-gray-500">
        Nenhuma disciplina com competências para exibir evolução.
      </div>
    );
  }

  const selectedDisciplina = availableDisciplinas.find(d => d.disciplina_id === selectedDisciplinaId);

  return (
    <div className="bg-white p-8 rounded-3xl shadow-2xl">
      <div className="mb-6">
        <label htmlFor="disciplina-select" className="block text-lg font-medium text-gray-700 mb-2">
          Selecione uma Disciplina
        </label>
        <select
          id="disciplina-select"
          value={selectedDisciplinaId}
          onChange={(e) => setSelectedDisciplinaId(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-lg"
        >
          {availableDisciplinas.map((disciplina) => (
            <option key={disciplina.disciplina_id} value={disciplina.disciplina_id}>
              {disciplina.disciplina_nome} ({disciplina.disciplina_codigo})
            </option>
          ))}
        </select>
      </div>

      {selectedDisciplina && (
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Competências de <span className="text-cyan-600">{selectedDisciplina.disciplina_nome}</span>
          </h3>
          {selectedDisciplina.competencias && selectedDisciplina.competencias.length > 0 ? (
            <div className="space-y-6">
              {selectedDisciplina.competencias.map((competencia) => (
                <CompetenciaItem key={competencia.competencia_id} competencia={competencia} />
              ))}
            </div>
          ) : (
             <p className="text-center text-gray-500 py-4">Nenhuma competência com avaliações encontrada para esta disciplina.</p>
          )}
        </div>
      )}
    </div>
  );
};


const CompetenciasDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('overview'); // overview, disciplinas, dominios

  const [disciplinaEvolucaoData, setDisciplinaEvolucaoData] = useState(null);
  const [loadingDisciplinaEvolucao, setLoadingDisciplinaEvolucao] = useState(false);
  const [errorDisciplinaEvolucao, setErrorDisciplinaEvolucao] = useState(null);

  useEffect(() => {
    getCompetenciasStats()
      .then(stats => {
        setData(stats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar competências:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (viewMode === 'disciplinas' && !disciplinaEvolucaoData) {
      setLoadingDisciplinaEvolucao(true);
      fetchCompetenciasEvolucaoPorDisciplina()
        .then(data => {
          setDisciplinaEvolucaoData(data);
          setLoadingDisciplinaEvolucao(false);
        })
        .catch(err => {
          setErrorDisciplinaEvolucao(err.message || 'Falha ao carregar dados.');
          setLoadingDisciplinaEvolucao(false);
        });
    }
  }, [viewMode, disciplinaEvolucaoData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-cyan-600 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">A carregar Competências...</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-10 text-center text-xl text-red-600">Erro ao carregar dados</div>;

  // Cores para os níveis de proficiência
  const coresNiveis = {
    'Fraco': '#dc2626',
    'Não Satisfaz': '#f97316',
    'Satisfaz': '#eab308',
    'Satisfaz Bastante': '#22c55e',
    'Excelente': '#3b82f6'
  };

  const getNivelColor = (media) => {
    if (media >= 4.5) return 'text-blue-600';
    if (media >= 3.5) return 'text-green-600';
    if (media >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  // Calcular média global
  const mediaGlobal = data.distribuicaoNiveis && data.distribuicaoNiveis.length > 0
    ? (data.distribuicaoNiveis.reduce((sum, n) => {
        const valor = n.nivel === 'Fraco' ? 1 : 
                      n.nivel === 'Não Satisfaz' ? 2 :
                      n.nivel === 'Satisfaz' ? 3 :
                      n.nivel === 'Satisfaz Bastante' ? 4 : 5;
        return sum + (valor * n.count);
      }, 0) / data.distribuicaoNiveis.reduce((sum, n) => sum + n.count, 0)).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Layers className="w-14 h-14 text-cyan-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
              Avaliação por Competências
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Sistema de avaliação baseado em proficiência — acompanhamento individualizado do desenvolvimento de competências essenciais
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm flex-wrap">
            <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full font-semibold">
              Ano Letivo 2024/2025
            </span>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
              {data.overview?.disciplinas_ativas || 0} Disciplinas
            </span>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
              {data.overview?.total_competencias || 0} Competências Ativas
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              viewMode === 'overview' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setViewMode('disciplinas')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              viewMode === 'disciplinas' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Por Disciplina
          </button>
          <button
            onClick={() => setViewMode('dominios')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              viewMode === 'dominios' ? 'bg-cyan-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Por Domínio
          </button>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-cyan-500">
            <div className="text-cyan-600 text-sm font-medium mb-1">Competências</div>
            <div className="text-3xl font-bold text-gray-800">{data.overview?.total_competencias || 0}</div>
            <div className="text-xs text-gray-500 mt-1">
              {data.overview?.competencias_validadas || 0} validadas
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="text-blue-600 text-sm font-medium mb-1">Avaliações</div>
            <div className="text-3xl font-bold text-gray-800">
              {(data.overview?.total_avaliacoes || 0).toLocaleString('pt-PT')}
            </div>
            <div className="text-xs text-gray-500 mt-1">realizadas</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="text-indigo-600 text-sm font-medium mb-1">Alunos</div>
            <div className="text-3xl font-bold text-gray-800">{data.overview?.alunos_avaliados || 0}</div>
            <div className="text-xs text-gray-500 mt-1">avaliados</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="text-green-600 text-sm font-medium mb-1">Média Global</div>
            <div className={`text-3xl font-bold ${getNivelColor(parseFloat(mediaGlobal))}`}>
              {mediaGlobal}
            </div>
            <div className="text-xs text-gray-500 mt-1">nível proficiência</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-amber-500">
            <div className="text-amber-600 text-sm font-medium mb-1">Com Medidas</div>
            <div className="text-3xl font-bold text-gray-800">{data.overview?.competencias_com_medidas || 0}</div>
            <div className="text-xs text-gray-500 mt-1">educativas</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="text-purple-600 text-sm font-medium mb-1">Disciplinas</div>
            <div className="text-3xl font-bold text-gray-800">{data.overview?.disciplinas_ativas || 0}</div>
            <div className="text-xs text-gray-500 mt-1">ativas</div>
          </div>
        </div>

        {/* VIEW MODE: OVERVIEW */}
        {viewMode === 'overview' && (
          <>
            {/* Distribuição de Níveis de Proficiência */}
            {data.distribuicaoNiveis && data.distribuicaoNiveis.length > 0 && (
              <div className="bg-white rounded-3xl shadow-2xl p-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <Target className="w-8 h-8 text-cyan-600" />
                  Distribuição de Níveis de Proficiência
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Gráfico de Barras */}
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data.distribuicaoNiveis}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="nivel" 
                        angle={-15} 
                        textAnchor="end" 
                        height={100}
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '12px'
                        }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {data.distribuicaoNiveis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={coresNiveis[entry.nivel] || '#6b7280'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Cards de Níveis */}
                  <div className="space-y-3">
                    {data.distribuicaoNiveis.map((nivel, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:shadow-md transition-all">
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                          style={{ backgroundColor: coresNiveis[nivel.nivel] || '#6b7280' }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800">{nivel.nivel}</div>
                          <div className="text-sm text-gray-600">
                            {nivel.count} avaliações ({nivel.percent}%)
                          </div>
                        </div>
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min(nivel.percent * 2, 100)}%`, 
                              backgroundColor: coresNiveis[nivel.nivel] || '#6b7280'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Competências com Maior Dificuldade */}
            {data.topCompetenciasDificeis && data.topCompetenciasDificeis.length > 0 && (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl shadow-2xl p-8 border-2 border-red-200">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  Competências que Necessitam Reforço
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.topCompetenciasDificeis.map((comp, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                              {comp.codigo}
                            </span>
                            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                              {comp.disciplina}
                            </span>
                            {comp.medida_educativa !== 'nenhuma' && (
                              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                                Medida: {comp.medida_educativa}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{comp.nome}</h3>
                          {comp.dominios && comp.dominios.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {comp.dominios.map((dom, i) => (
                                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        {dom}
                                    </span>
                                ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${getNivelColor(comp.media_nivel)}`}>
                            {comp.media_nivel}
                          </div>
                          <div className="text-sm text-gray-600">média</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div className="bg-red-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-red-600">{comp.qtd_fraco}</div>
                          <div className="text-xs text-gray-600">Fraco</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-orange-600">{comp.qtd_nao_satisfaz}</div>
                          <div className="text-xs text-gray-600">Não Satisfaz</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-2xl font-bold text-blue-600">{comp.alunos_avaliados}</div>
                          <div className="text-xs text-gray-600">Total Avaliados</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* VIEW MODE: DISCIPLINAS */}
        {viewMode === 'disciplinas' && (
           <DisciplinaEvolucaoView 
              data={disciplinaEvolucaoData}
              loading={loadingDisciplinaEvolucao}
              error={errorDisciplinaEvolucao}
            />
        )}

        {/* VIEW MODE: DOMINIOS */}
        {viewMode === 'dominios' && (
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <Layers className="w-8 h-8 text-purple-600" />
              Estatísticas por Domínio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.dominiosResumo && data.dominiosResumo.length > 0 ? (
                data.dominiosResumo.map((dominio, idx) => (
                  <div key={idx} className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-purple-800 mb-3">{dominio.dominio_nome}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Competências Associadas:</span>
                        <span className="font-semibold">{dominio.total_competencias}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Total de Avaliações:</span>
                        <span className="font-semibold">{dominio.total_avaliacoes}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-700">
                        <span>Nível Médio:</span>
                        <span className={`font-bold ${getNivelColor(dominio.media_nivel)}`}>
                          {dominio.media_nivel ? dominio.media_nivel.toFixed(2) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                  <p className="text-xl font-semibold text-amber-800">
                    Não existem dados de domínios disponíveis.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetenciasDashboard;