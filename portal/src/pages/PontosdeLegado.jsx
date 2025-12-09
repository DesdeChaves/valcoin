import React, { useState, useEffect } from 'react';
import { Award, TrendingUp, Users, Sparkles, Trophy, Star, Heart, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { getLegadosStats } from '../services/api';


const LegadosDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLegadosStats()
      .then(apiData => {
        const processedStats = {
          totalLegados: Number(apiData.totalLegados.total_legados) || 0,
          alunosDistintos: Number(apiData.totalLegados.alunos_distintos) || 0,
          categorias: apiData.porCategoria || [],
          topAlunos: apiData.topAlunos || [],
          recentesLegados: (apiData.recentes || []).map(legado => ({
            ...legado,
            data: new Date(legado.data_atribuicao).toISOString().split('T')[0] // Format to YYYY-MM-DD
          })),
          // evolucaoMensal is not available from the current API
        };
        setStats(processedStats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar estatísticas de legados:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-purple-600 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">A carregar Legados...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Inspirador */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-amber-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Pontos de Legado
            </h1>
            <Trophy className="w-12 h-12 text-amber-500" />
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Um ideia de <span className="font-bold text-purple-600">Jorge Magalhães</span> no seu projeto 
            <span className="font-bold text-pink-600"> Construir Amanhãs</span> — 
            reconhecendo mérito excepcional em atitudes, resiliência e superação
          </p>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-12 h-12 opacity-80" />
              <Sparkles className="w-8 h-8 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-2">Total de Legados Atribuídos</div>
            <div className="text-6xl font-bold">{stats.totalLegados}</div>
            <div className="mt-3 text-sm opacity-80">Momentos de excelência reconhecidos</div>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-700 text-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-12 h-12 opacity-80" />
              <Star className="w-8 h-8 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-2">Alunos Distinguidos</div>
            <div className="text-6xl font-bold">{stats.alunosDistintos}</div>
            <div className="mt-3 text-sm opacity-80">Estudantes que deixam marca</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-12 h-12 opacity-80" />
              <Heart className="w-8 h-8 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-2">Média por Aluno</div>
            <div className="text-6xl font-bold">
              {stats.alunosDistintos > 0 ? (stats.totalLegados / stats.alunosDistintos).toFixed(1) : '0.0'}
            </div>
            <div className="mt-3 text-sm opacity-80">Reconhecimentos de excelência</div>
          </div>
        </div>

        {/* Categorias de Legados - Grid Visual */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-600" />
            Categorias de Mérito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stats.categorias.map((cat, idx) => (
              <div 
                key={idx}
                className="relative overflow-hidden rounded-2xl p-6 transform hover:scale-105 transition-all cursor-pointer border-2"
                style={{ 
                  backgroundColor: cat.color + '15',
                  borderColor: cat.color + '40'
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-5xl">{cat.icon}</span>
                  <div 
                    className="text-3xl font-bold px-4 py-2 rounded-xl text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.count}
                  </div>
                </div>
                <h3 className="text-xl font-bold" style={{ color: cat.color }}>
                  {cat.categoria}
                </h3>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${(Number(cat.count) / stats.totalLegados) * 100}%`,
                      backgroundColor: cat.color
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {((Number(cat.count) / stats.totalLegados) * 100).toFixed(1)}% do total
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Evolução Temporal - REMOVIDO pois não há dados da API */}
        {/*
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6">Evolução Mensal</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  return (
                    <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-purple-200">
                      <p className="font-bold text-lg">{payload[0].payload.mes}</p>
                      <p className="text-purple-600 text-2xl font-bold">{payload[0].value} legados</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" fill="url(#colorGradient)" radius={[10, 10, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={1} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
        */}

        {/* Top 5 Alunos */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl shadow-2xl p-8 border-2 border-amber-200">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-600" />
            Hall da Fama - Top 5 Alunos
          </h2>
          <div className="space-y-4">
            {stats.topAlunos.map((aluno, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl p-6 flex items-center gap-6 transform hover:scale-102 transition-all shadow-lg hover:shadow-xl"
              >
                <div className={`
                  flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold text-white
                  ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-300' : ''}
                  ${idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' : ''}
                  ${idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' : ''}
                  ${idx >= 3 ? 'bg-gradient-to-br from-purple-500 to-pink-500' : ''}
                `}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800">{aluno.nome}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {aluno.categorias.map((cat, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-purple-600">{aluno.legados}</div>
                  <div className="text-sm text-gray-600">legados</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legados Recentes */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-pink-600" />
            Reconhecimentos Recentes
          </h2>
          <div className="space-y-6">
            {stats.recentesLegados.map((legado, idx) => (
              <div 
                key={idx}
                className="border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 rounded-r-2xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{legado.aluno}</h3>
                    <span className="inline-block mt-2 px-4 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
                      {legado.categoria}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <div>{new Date(legado.data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="text-xs mt-1">por {legado.atribuidor}</div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed italic">"{legado.descricao}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé Inspirador */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="w-8 h-8" />
            <h3 className="text-2xl font-bold">Cada legado conta uma história de superação</h3>
            <Star className="w-8 h-8" />
          </div>
          <p className="text-lg opacity-90">
            Inspirando gerações através do reconhecimento da excelência humana
          </p>
        </div>

      </div>
    </div>
  );
};

export default LegadosDashboard;
