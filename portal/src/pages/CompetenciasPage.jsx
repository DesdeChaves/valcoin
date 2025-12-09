import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, Users, Award, CheckCircle, AlertTriangle, Layers, Target, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { getCompetenciasStats } from '../services/api';

const CompetenciasDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDisciplina, setSelectedDisciplina] = useState('todas');

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

        {/* Filtro de Disciplinas */}
        {disciplinasComAvaliacao.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-4 flex-wrap">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">Filtrar por disciplina:</span>
            <button
              onClick={() => setSelectedDisciplina('todas')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedDisciplina === 'todas' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({disciplinasComAvaliacao.length})
            </button>
            {disciplinasComAvaliacao.map(disc => (
              <button
                key={disc.disciplina_id}
                onClick={() => setSelectedDisciplina(disc.disciplina_id)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedDisciplina === disc.disciplina_id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {disc.disciplina_nome}
              </button>
            ))}
          </div>
        )}

        {/* Cards de Disciplinas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {disciplinasFiltradas.map(disc => (
            <div 
              key={disc.disciplina_id}
              className="bg-white border-2 border-indigo-100 rounded-3xl p-8 hover:shadow-2xl transition-all cursor-pointer bg-gradient-to-br from-white to-indigo-50"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-2xl font-bold text-gray-800">{disc.disciplina_nome}</h3>
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{disc.disciplina_codigo}</p>
                </div>
                <div className={`text-5xl font-bold ${getNivelColor(disc.media_nivel)}`}>
                  {disc.media_nivel > 0 ? disc.media_nivel : '—'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-indigo-600">{disc.total_competencias}</div>
                  <div className="text-xs text-gray-600 mt-1">Competências</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-green-600">{disc.competencias_validadas}</div>
                  <div className="text-xs text-gray-600 mt-1">Validadas</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-amber-600">{disc.competencias_com_medidas}</div>
                  <div className="text-xs text-gray-600 mt-1">c/ Medidas</div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-sm font-semibold text-blue-700 mb-2">
                  📊 {disc.total_avaliacoes} avaliações realizadas
                </div>
                {disc.dominios && disc.dominios.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-600 mb-2">Domínios:</div>
                    <div className="flex flex-wrap gap-2">
                      {disc.dominios.map((dom, i) => (
                        <span key={i} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                          {dom}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem se não houver disciplinas com avaliações */}
        {disciplinasComAvaliacao.length === 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-amber-800">
              Ainda não existem avaliações de competências registadas
            </p>
            <p className="text-amber-600 mt-2">
              As avaliações aparecerão aqui assim que forem registadas pelos professores
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default CompetenciasDashboard;
