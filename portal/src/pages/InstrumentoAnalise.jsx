import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { getInstrumentoAnalise } from '../services/api';
// Simular API (substitui pela tua função real)

const IncrementoAnalysis = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInstrumentoAnalise()
      .then(d => {
        const formatados = d.map((p) => ({
          ...p,
          positivos: Number(p.positivos),
          negativos: Number(p.negativos),
          saldo: Number(p.positivos) - Number(p.negativos),
          data_inicio: new Date(p.data_inicio).toLocaleDateString('pt-PT'),
          data_fim: new Date(p.data_fim).toLocaleDateString('pt-PT'),
        }));
        setData(formatados);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching instrumento analise data:", err);
        setLoading(false);
      });
  }, []);

  // Calcular evolução entre últimos 2 blocos
  const ultimoBloco = data[data.length - 1];
  const penultimoBloco = data[data.length - 2];

  const evolucao = ultimoBloco && penultimoBloco ? {
    positivos: ultimoBloco.positivos - penultimoBloco.positivos,
    negativos: ultimoBloco.negativos - penultimoBloco.negativos,
    saldo: ultimoBloco.saldo - penultimoBloco.saldo,
    positivosPercent: penultimoBloco.positivos > 0 
      ? ((ultimoBloco.positivos - penultimoBloco.positivos) / penultimoBloco.positivos * 100).toFixed(1)
      : 0,
    negativosPercent: penultimoBloco.negativos > 0
      ? ((ultimoBloco.negativos - penultimoBloco.negativos) / penultimoBloco.negativos * 100).toFixed(1)
      : 0,
  } : null;

  const totalPos = data.reduce((s, p) => s + p.positivos, 0);
  const totalNeg = data.reduce((s, p) => s + p.negativos, 0);
  const saldoGlobal = totalPos - totalNeg;

  if (loading) return <div className="p-10 text-center">A carregar análise comportamental...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Análise Comportamental</h1>
          <p className="text-gray-600">Objetivo: 1% melhor a cada 10 dias letivos</p>
        </div>

        {/* Evolução entre últimos 2 blocos - DESTAQUE PRINCIPAL */}
        {evolucao && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Evolução Recente (últimos 10 dias)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Reforços Positivos */}
              <div className={`backdrop-blur rounded-2xl p-6 border-2 transition-all ${
                parseFloat(evolucao.positivosPercent) >= 1 
                  ? 'bg-green-500/20 border-green-300 shadow-lg shadow-green-500/50' 
                  : 'bg-white/10 border-white/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-medium">Reforços Positivos</span>
                  {evolucao.positivos >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-300" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-300" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm opacity-80">{penultimoBloco.positivos} →</span>
                  <span className="text-4xl font-bold">{ultimoBloco.positivos}</span>
                </div>
                <div className={`text-xl font-semibold mt-2 ${evolucao.positivos >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {evolucao.positivos > 0 ? '+' : ''}{evolucao.positivos} ({evolucao.positivosPercent > 0 ? '+' : ''}{evolucao.positivosPercent}%)
                </div>
                {parseFloat(evolucao.positivosPercent) >= 1 && (
                  <div className="mt-3 px-3 py-2 bg-green-400/30 rounded-lg text-sm font-bold text-green-100 flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span>Objetivo alcançado!</span>
                  </div>
                )}
              </div>

              {/* Reforços Negativos */}
              <div className={`backdrop-blur rounded-2xl p-6 border-2 transition-all ${
                parseFloat(evolucao.negativosPercent) <= -1 
                  ? 'bg-green-500/20 border-green-300 shadow-lg shadow-green-500/50' 
                  : 'bg-white/10 border-white/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-medium">Reforços Negativos</span>
                  {evolucao.negativos <= 0 ? (
                    <TrendingDown className="w-6 h-6 text-green-300" />
                  ) : (
                    <TrendingUp className="w-6 h-6 text-red-300" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm opacity-80">{penultimoBloco.negativos} →</span>
                  <span className="text-4xl font-bold">{ultimoBloco.negativos}</span>
                </div>
                <div className={`text-xl font-semibold mt-2 ${evolucao.negativos <= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {evolucao.negativos > 0 ? '+' : ''}{evolucao.negativos} ({evolucao.negativosPercent > 0 ? '+' : ''}{evolucao.negativosPercent}%)
                </div>
                {parseFloat(evolucao.negativosPercent) <= -1 && (
                  <div className="mt-3 px-3 py-2 bg-green-400/30 rounded-lg text-sm font-bold text-green-100 flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span>Objetivo alcançado!</span>
                  </div>
                )}
              </div>

              {/* Saldo Líquido */}
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-medium">Saldo Líquido</span>
                  {evolucao.saldo >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-300" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-300" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm opacity-80">{penultimoBloco.saldo > 0 ? '+' : ''}{penultimoBloco.saldo} →</span>
                  <span className="text-4xl font-bold">{ultimoBloco.saldo > 0 ? '+' : ''}{ultimoBloco.saldo}</span>
                </div>
                <div className={`text-xl font-semibold mt-2 ${evolucao.saldo >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {evolucao.saldo > 0 ? '+' : ''}{evolucao.saldo} pontos
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white/10 backdrop-blur rounded-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="w-5 h-5" />
                  <span>
                    Comparação: <strong>{penultimoBloco.periodo}</strong> ({penultimoBloco.data_inicio} – {penultimoBloco.data_fim}) 
                    vs <strong>{ultimoBloco.periodo}</strong> ({ultimoBloco.data_inicio} – {ultimoBloco.data_fim})
                  </span>
                </div>
                
                {/* Contador de objetivos alcançados */}
                {(parseFloat(evolucao.positivosPercent) >= 1 || parseFloat(evolucao.negativosPercent) <= -1) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-500/30 rounded-lg">
                    <span className="text-2xl">🏆</span>
                    <div className="text-sm">
                      <div className="font-bold">
                        {[
                          parseFloat(evolucao.positivosPercent) >= 1,
                          parseFloat(evolucao.negativosPercent) <= -1
                        ].filter(Boolean).length} de 2 objetivos alcançados
                      </div>
                      <div className="text-xs opacity-90">Estamos no bom caminho!</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KPIs Globais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center bg-green-50">
            <div className="text-green-600 text-sm font-medium mb-2">Total Positivos</div>
            <div className="text-5xl font-bold text-green-700">+{totalPos}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center bg-red-50">
            <div className="text-red-600 text-sm font-medium mb-2">Total Negativos</div>
            <div className="text-5xl font-bold text-red-700">–{totalNeg}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center bg-blue-50">
            <div className="text-blue-600 text-sm font-medium mb-2">Saldo Global</div>
            <div className={`text-5xl font-bold ${saldoGlobal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {saldoGlobal > 0 ? '+' : ''}{saldoGlobal}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center bg-orange-50">
            <div className="text-orange-600 text-sm font-medium mb-2">Blocos de 10 dias</div>
            <div className="text-5xl font-bold text-orange-700">{data.length}</div>
          </div>
        </div>

        {/* Gráfico de Evolução */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Evolução ao longo do tempo</h2>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="periodo" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white p-5 rounded-xl shadow-2xl border-2 border-indigo-200">
                      <p className="font-bold text-lg mb-2">{d.periodo}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-green-600">Positivos: <strong>+{d.positivos}</strong></p>
                        <p className="text-red-600">Negativos: <strong>–{d.negativos}</strong></p>
                        <p className="text-blue-700 font-bold text-base">Saldo: {d.saldo > 0 ? '+' : ''}{d.saldo}</p>
                        <p className="text-gray-500 text-xs mt-2 pt-2 border-t">
                          {d.data_inicio} → {d.data_fim} ({d.dias_ativos} dias letivos)
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="positivos" stroke="#10b981" strokeWidth={3} name="Reforços Positivos" dot={{ r: 5 }} />
              <Line type="monotone" dataKey="negativos" stroke="#ef4444" strokeWidth={3} name="Reforços Negativos" dot={{ r: 5 }} />
              <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={4} name="Saldo Líquido" dot={{ r: 7, fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela Detalhada */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 border-b bg-gradient-to-r from-gray-50 to-blue-50">
            <h2 className="text-2xl font-bold">Histórico Completo (blocos de 10 dias letivos)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold">Bloco</th>
                  <th className="px-6 py-4 text-center text-green-600 font-semibold">Positivos</th>
                  <th className="px-6 py-4 text-center text-red-600 font-semibold">Negativos</th>
                  <th className="px-6 py-4 text-center text-blue-600 font-semibold">Saldo</th>
                  <th className="px-6 py-4 text-center font-semibold">Datas</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p, idx) => (
                  <tr 
                    key={p.periodo} 
                    className={`border-b hover:bg-blue-50 transition ${idx >= data.length - 2 ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="px-6 py-5 font-medium">
                      {p.periodo}
                      {idx >= data.length - 2 && (
                        <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                          Recente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center text-green-600 text-2xl font-bold">+{p.positivos}</td>
                    <td className="px-6 py-5 text-center text-red-600 text-2xl font-bold">–{p.negativos}</td>
                    <td className={`px-6 py-5 text-center text-3xl font-bold ${p.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {p.saldo > 0 ? '+' : ''}{p.saldo}
                    </td>
                    <td className="px-6 py-5 text-center text-gray-600 text-sm">
                      {p.data_inicio} → {p.data_fim}<br />
                      <span className="text-xs text-gray-500">({p.dias_ativos} dias letivos)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncrementoAnalysis;
