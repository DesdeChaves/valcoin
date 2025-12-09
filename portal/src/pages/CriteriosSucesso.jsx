import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Users, AlertCircle, CheckCircle, Clock, Award, BookOpen, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

// Simular API
/* const getCriteriosStats = async () => {
  return {
    departamentos: [
      {
        departamento_id: 1,
        departamento_nome: 'Matemática',
        total_criterios: 24,
        total_disciplinas: 3,
        professores_envolvidos: 8,
        alunos_avaliados: 156,
        alunos_com_sucesso: 112,
        media_pontuacoes: 3.2
      },
      {
        departamento_id: 2,
        departamento_nome: 'Português',
        total_criterios: 28,
        total_disciplinas: 2,
        professores_envolvidos: 6,
        alunos_avaliados: 145,
        alunos_com_sucesso: 98,
        media_pontuacoes: 2.9
      },
      {
        departamento_id: 3,
        departamento_nome: 'Ciências',
        total_criterios: 20,
        total_disciplinas: 4,
        professores_envolvidos: 7,
        alunos_avaliados: 138,
        alunos_com_sucesso: 105,
        media_pontuacoes: 3.4
      }
    ],
    criteriosPendentes: [
      {
        criterio_codigo: 'MAT-7-01',
        criterio_nome: 'Resolver equações do 1º grau',
        departamento_nome: 'Matemática',
        ano_escolaridade_inicial: 7,
        nivel_aceitavel: 3,
        alunos_pendentes: 23,
        media_pontuacao_atual: 2.1,
        taxa_sucesso: 45
      },
      {
        criterio_codigo: 'PORT-8-03',
        criterio_nome: 'Identificar recursos estilísticos',
        departamento_nome: 'Português',
        ano_escolaridade_inicial: 8,
        nivel_aceitavel: 3,
        alunos_pendentes: 31,
        media_pontuacao_atual: 1.9,
        taxa_sucesso: 38
      },
      {
        criterio_codigo: 'CN-9-02',
        criterio_nome: 'Interpretar gráficos de funções',
        departamento_nome: 'Ciências',
        ano_escolaridade_inicial: 9,
        nivel_aceitavel: 3,
        alunos_pendentes: 18,
        media_pontuacao_atual: 2.4,
        taxa_sucesso: 58
      }
    ],
    alunosCriticos: [
      {
        aluno_id: 1,
        aluno_nome: 'João Silva',
        ano_atual: 9,
        criterios_pendentes: 8,
        anos_medio_atraso: 1.5,
        departamentos_afetados: ['Matemática', 'Português']
      },
      {
        aluno_id: 2,
        aluno_nome: 'Maria Santos',
        ano_atual: 8,
        criterios_pendentes: 6,
        anos_medio_atraso: 1.2,
        departamentos_afetados: ['Ciências']
      },
      {
        aluno_id: 3,
        aluno_nome: 'Pedro Costa',
        ano_atual: 10,
        criterios_pendentes: 12,
        anos_medio_atraso: 2.1,
        departamentos_afetados: ['Matemática', 'Português', 'Ciências']
      }
    ],
    evolucaoMensal: [
      { mes: 'Set', avaliados: 45, sucesso: 32, taxa: 71 },
      { mes: 'Out', avaliados: 68, sucesso: 51, taxa: 75 },
      { mes: 'Nov', avaliados: 82, sucesso: 64, taxa: 78 },
      { mes: 'Dez', avaliados: 95, sucesso: 73, taxa: 77 },
      { mes: 'Jan', avaliados: 110, sucesso: 87, taxa: 79 }
    ],
    distribuicaoPontuacoes: [
      { nivel: '1 - Iniciado', count: 45, cor: '#ef4444' },
      { nivel: '2 - Em Progresso', count: 78, cor: '#f59e0b' },
      { nivel: '3 - Proficiente', count: 112, cor: '#10b981' },
      { nivel: '4 - Avançado', count: 68, cor: '#3b82f6' }
    ]
  };
};
*/

import { getCriteriosSucessoStats } from '../services/api';

const CriteriosSucessoDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroAno, setFiltroAno] = useState('todos');
  const [filtroDepartamento, setFiltroDepartamento] = useState('todos');
  const [expandedDept, setExpandedDept] = useState(null);

  useEffect(() => {
    getCriteriosSucessoStats()
      .then(stats => {
        setData(stats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar critérios:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <Target className="w-16 h-16 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">A carregar Critérios de Sucesso...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalAlunos = data.departamentos.reduce((sum, d) => sum + d.alunos_avaliados, 0);
  const totalComSucesso = data.departamentos.reduce((sum, d) => sum + d.alunos_com_sucesso, 0);
  const taxaSucessoGlobal = totalAlunos > 0 ? Math.round((totalComSucesso / totalAlunos) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Target className="w-14 h-14 text-indigo-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Critérios de Sucesso
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            Monitorização de objetivos de aprendizagem por departamento — 
            garantindo que cada aluno domina competências transversais essenciais no momento certo - acompanhamento longitudinal dos alunos.
          </p>
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-10 h-10 opacity-80" />
              <CheckCircle className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-1">Alunos Avaliados</div>
            <div className="text-5xl font-bold">{totalAlunos}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <Award className="w-10 h-10 opacity-80" />
              <TrendingUp className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-1">Com Sucesso</div>
            <div className="text-5xl font-bold">{totalComSucesso}</div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 text-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-10 h-10 opacity-80" />
              <CheckCircle className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-1">Taxa de Sucesso</div>
            <div className="text-5xl font-bold">{taxaSucessoGlobal}%</div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <AlertCircle className="w-10 h-10 opacity-80" />
              <Clock className="w-6 h-6 opacity-60" />
            </div>
            <div className="text-sm font-medium opacity-90 mb-1">Alunos Pendentes</div>
            <div className="text-5xl font-bold">{totalAlunos - totalComSucesso}</div>
          </div>
        </div>

        {/* Dashboard por Departamento */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            Performance por Departamento
          </h2>
          <div className="space-y-4">
            {data.departamentos.map(dept => {
              const taxaSucesso = dept.alunos_avaliados > 0 
                ? Math.round((dept.alunos_com_sucesso / dept.alunos_avaliados) * 100)
                : 0;
              const isExpanded = expandedDept === dept.departamento_id;
              
              return (
                <div key={dept.departamento_id} className="border-2 border-indigo-100 rounded-2xl overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-50 to-cyan-50 p-6 cursor-pointer hover:from-indigo-100 hover:to-cyan-100 transition-all"
                    onClick={() => setExpandedDept(isExpanded ? null : dept.departamento_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold">
                          {dept.departamento_nome.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-800">{dept.departamento_nome}</h3>
                          <div className="flex gap-4 text-sm text-gray-600 mt-1">
                            <span>{dept.total_criterios} critérios</span>
                            <span>•</span>
                            <span>{dept.professores_envolvidos} professores</span>
                            <span>•</span>
                            <span>{dept.total_disciplinas} disciplinas</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-4xl font-bold ${taxaSucesso >= 75 ? 'text-green-600' : taxaSucesso >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {taxaSucesso}%
                          </div>
                          <div className="text-sm text-gray-600">Taxa de Sucesso</div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
                      </div>
                    </div>
                    
                    {/* Barra de Progresso */}
                    <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${taxaSucesso >= 75 ? 'bg-green-600' : taxaSucesso >= 50 ? 'bg-amber-600' : 'bg-red-600'}`}
                        style={{ width: `${taxaSucesso}%` }}
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 bg-white border-t-2 border-indigo-100">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-xl">
                          <div className="text-3xl font-bold text-blue-600">{dept.alunos_avaliados}</div>
                          <div className="text-sm text-gray-600 mt-1">Alunos Avaliados</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-xl">
                          <div className="text-3xl font-bold text-green-600">{dept.alunos_com_sucesso}</div>
                          <div className="text-sm text-gray-600 mt-1">Com Sucesso</div>
                        </div>
                        <div className="text-center p-4 bg-indigo-50 rounded-xl">
                          <div className="text-3xl font-bold text-indigo-600">{dept.media_pontuacoes}</div>
                          <div className="text-sm text-gray-600 mt-1">Média Pontuações</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Critérios Pendentes - Foco de Intervenção */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl shadow-2xl p-8 border-2 border-red-200">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            Critérios com Maior Dificuldade
          </h2>
          <p className="text-gray-700 mb-6">Critérios onde há mais alunos com pontuação abaixo do nível aceitável</p>
          <div className="space-y-4">
            {data.criteriosPendentes.map((crit, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-sm font-bold">
                        {crit.criterio_codigo}
                      </span>
                      <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                        {crit.departamento_nome}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {crit.ano_escolaridade_inicial}º ano
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{crit.criterio_nome}</h3>
                    <div className="flex gap-6 mt-3 text-sm text-gray-600">
                      <span>Nível aceitável: <strong>{crit.nivel_aceitavel}</strong></span>
                      <span>Média atual: <strong className="text-amber-600">{crit.media_pontuacao_atual}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-red-600">{crit.alunos_pendentes}</div>
                    <div className="text-sm text-gray-600">alunos pendentes</div>
                    <div className="mt-2 text-lg font-semibold text-amber-600">{crit.taxa_sucesso}% sucesso</div>
                  </div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                    style={{ width: `${100 - crit.taxa_sucesso}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alunos Críticos */}
        {/* <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-600" />
            Alunos Prioritários para Intervenção
          </h2>
          <p className="text-gray-700 mb-6">Alunos com maior número de critérios pendentes</p>
          <div className="space-y-4">
            {data.alunosCriticos.map((aluno, idx) => (
              <div key={aluno.aluno_id} className="border-l-4 border-amber-500 bg-amber-50 rounded-r-2xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-600 text-white flex items-center justify-center text-xl font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{aluno.aluno_nome}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                          {aluno.ano_atual}º ano
                        </span>
                        {aluno.departamentos_afetados.map((dept, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                            {dept}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold text-amber-600">{aluno.criterios_pendentes}</div>
                    <div className="text-sm text-gray-600">critérios pendentes</div>
                    <div className="text-sm text-red-600 mt-1">~{aluno.anos_medio_atraso} anos de atraso</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Evolução Mensal */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Evolução Mensal</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="taxa" stroke="#10b981" strokeWidth={3} name="Taxa Sucesso (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição de Pontuações */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold mb-6">Distribuição de Níveis</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.distribuicaoPontuacoes}
                  dataKey="count"
                  nameKey="nivel"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {data.distribuicaoPontuacoes.map((entry, index) => (
                    <Cell key={index} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CriteriosSucessoDashboard;
