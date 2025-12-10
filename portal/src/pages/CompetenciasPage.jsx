import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, Users, Award, CheckCircle, AlertTriangle, Layers, Target, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, LineChart, Line } from 'recharts';
import { getCompetenciasStats, fetchCompetencyEvolutionByDiscipline } from '../services/api'; // Import new API function

const CompetenciasDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDisciplina, setSelectedDisciplina] = useState('todas');
  const [viewMode, setViewMode] = useState('overview'); // overview, disciplinas, dominios
  const [expandedDisciplina, setExpandedDisciplina] = useState(null);
  const [competencyEvolutionData, setCompetencyEvolutionData] = useState({}); // New state for evolution data
  const [loadingEvolution, setLoadingEvolution] = useState(false);
  const [errorEvolution, setErrorEvolution] = useState(null);

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
    if (expandedDisciplina) {
      setLoadingEvolution(true);
      setErrorEvolution(null);
      fetchCompetencyEvolutionByDiscipline(expandedDisciplina)
        .then(evolutionStats => {
          // Group evolution stats by competency_id for easier rendering
          const groupedEvolution = evolutionStats.reduce((acc, current) => {
            const { competencia_id, ...rest } = current;
            if (!acc[competencia_id]) {
              acc[competencia_id] = {
                details: {
                  competencia_id: current.competencia_id,
                  competencia_codigo: current.competencia_codigo,
                  competencia_nome: current.competencia_nome,
                  dominios: current.dominios,
                  disciplina_id: current.disciplina_id,
                  disciplina_nome: current.disciplina_nome,
                  disciplina_codigo: current.disciplina_codigo,
                }, // Store common details (code, name, domains, etc.)
                moments: []
              };
            }
            acc[competencia_id].moments.push({
              descricao_momento: current.descricao_momento,
              momento_avaliacao: current.momento_avaliacao,
              data_avaliacao: current.data_avaliacao,
              media_nivel: current.media_nivel,
              total_alunos_avaliados: current.total_alunos_avaliados,
              p25: current.p25,
              p50_mediana: current.p50_mediana,
              p75: current.p75,
              p25_nivel: current.p25_nivel,
              p50_nivel: current.p50_nivel,
              p75_nivel: current.p75_nivel,
              qtd_fraco: current.qtd_fraco,
              qtd_nao_satisfaz: current.qtd_nao_satisfaz,
              qtd_satisfaz: current.qtd_satisfaz,
              qtd_satisfaz_bastante: current.qtd_satisfaz_bastante,
              qtd_excelente: current.qtd_excelente,
            });
            return acc;
          }, {});
          setCompetencyEvolutionData(prev => ({ ...prev, [expandedDisciplina]: groupedEvolution }));
          setLoadingEvolution(false);
        })
        .catch(err => {
          console.error('Erro ao carregar evolução da competência:', err);
          setErrorEvolution('Falha ao carregar dados de evolução.');
          setLoadingEvolution(false);
        });
    }
  }, [expandedDisciplina]);

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

  const getNivelDisplay = (media) => {
    if (media >= 4.5) return 'Excelente';
    if (media >= 3.5) return 'Satisfaz Bastante';
    if (media >= 2.5) return 'Satisfaz';
    if (media >= 1.5) return 'Não Satisfaz';
    return 'Fraco';
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

  // Filtrar disciplinas
  const disciplinasComAvaliacao = data.disciplinasResumo?.filter(d => d.total_avaliacoes > 0) || [];
  const disciplinasFiltradas = selectedDisciplina === 'todas' 
    ? disciplinasComAvaliacao 
    : disciplinasComAvaliacao.filter(d => d.disciplina_id === selectedDisciplina);

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
          <div className="tab-disciplinas-content">
            {/* DEBUG: Conteúdo temporariamente comentado para encontrar erro JSX */}
            <div className="text-center py-8 text-xl text-gray-600">
              Conteúdo da tab "Por Disciplina" (em depuração)
            </div>
          </div>
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