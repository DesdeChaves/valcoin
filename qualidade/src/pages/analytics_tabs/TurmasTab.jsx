import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { mean, standardDeviation } from 'simple-statistics';

const TurmasTab = ({ avaliacoes = [] }) => {
  const [selectedAnoLetivo, setSelectedAnoLetivo] = useState('');
  const [selectedAnoEscolar, setSelectedAnoEscolar] = useState('');
  const [selectedDisciplina, setSelectedDisciplina] = useState('');

  // New states for cross-year comparison
  const [selectedAnoEscolarComparacao, setSelectedAnoEscolarComparacao] = useState('');
  const [selectedDisciplinaComparacao, setSelectedDisciplinaComparacao] = useState('');

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#14b8a6'];

  // Função para calcular média conforme IndicadoresTab
  const calculateMedia = (av) => {
    const classif = av.classificacoes || {};
    let sum = 0;
    let total = 0;
    if (av.ciclo === '1_ciclo') {
      sum = 1 * (classif.I || 0) + 2 * (classif.S || 0) + 3 * (classif.B || 0) + 4 * (classif.MB || 0);
      total = av.total_alunos || 1;
    } else if (av.ciclo === '2_ciclo' || av.ciclo === '3_ciclo') {
      for (let i = 1; i <= 5; i++) {
        sum += i * (classif[i.toString()] || 0);
      }
      total = av.total_alunos || 1;
    } else if (av.ciclo === 'secundario') {
      if (classif.media) return classif.media;
      sum = 4 * (classif['1_7'] || 0) + 8.5 * (classif['8_9'] || 0) + 11.5 * (classif['10_13'] || 0) +
            15.5 * (classif['14_17'] || 0) + 19 * (classif['18_20'] || 0);
      total = av.total_alunos || 1;
    }
    return total > 0 ? sum / total : 0;
  };

  // Enriquecer dados com média calculada (memoized)
  const avaliacoesComMedia = useMemo(() => avaliacoes.map(av => ({
    ...av,
    media_calculada: calculateMedia(av)
  })), [avaliacoes]);

  // Extrair listas únicas (memoized)
  const anosLetivosUnicos = useMemo(() => [...new Set(avaliacoes.map(av => av.ano_letivo))].sort(), [avaliacoes]);
  const anosEscolaresUnicos = useMemo(() => [...new Set(avaliacoes.map(av => av.ano))].sort(), [avaliacoes]);
  const disciplinasUnicas = useMemo(() => [...new Set(avaliacoes.map(av => av.disciplina))].sort(), [avaliacoes]);


  // Calcular CV por Ano Letivo (visão geral) - memoized
  const cvPorAnoLetivo = useMemo(() => {
    const porAnoLetivo = {};
    
    avaliacoesComMedia.forEach(av => {
      if (!porAnoLetivo[av.ano_letivo]) {
        porAnoLetivo[av.ano_letivo] = {
          percentPositivos: [],
          medias: []
        };
      }
      porAnoLetivo[av.ano_letivo].percentPositivos.push(av.percent_positivos || 0);
      porAnoLetivo[av.ano_letivo].medias.push(av.media_calculada);
    });

    return Object.entries(porAnoLetivo).map(([anoLetivo, dados]) => {
      if (dados.percentPositivos.length < 2) return null;
      
      const avgPos = mean(dados.percentPositivos);
      const stdPos = standardDeviation(dados.percentPositivos);
      const cvPos = (stdPos / avgPos) * 100 || 0;
      
      const avgMed = mean(dados.medias);
      const stdMed = standardDeviation(dados.medias);
      const cvMed = (stdMed / avgMed) * 100 || 0;

      return {
        anoLetivo,
        cv_positivas: cvPos,
        mean_positivas: avgPos,
        cv_medias: cvMed,
        mean_medias: avgMed,
        count: dados.percentPositivos.length
      };
    }).filter(Boolean).sort((a, b) => a.anoLetivo.localeCompare(b.anoLetivo));
  }, [avaliacoesComMedia]);

  // Análise detalhada por turma (quando filtros aplicados) - memoized
  const analiseDetalhada = useMemo(() => {
    if (!selectedAnoLetivo || !selectedAnoEscolar) return null;

    const filtrados = avaliacoesComMedia.filter(
      av => av.ano_letivo === selectedAnoLetivo && av.ano === selectedAnoEscolar
    );

    if (selectedDisciplina) {
      // Análise de uma disciplina específica
      const turmasDisciplina = filtrados.filter(av => av.disciplina === selectedDisciplina);
      
      if (turmasDisciplina.length < 2) return null;

      const dadosTurmas = turmasDisciplina.map(av => ({
        turma: av.turma,
        percentPositivos: av.percent_positivos || 0,
        media: av.media_calculada,
        totalAlunos: av.total_alunos || 0
      }));

      const percentPositivos = dadosTurmas.map(t => t.percentPositivos);
      const medias = dadosTurmas.map(t => t.media);

      return {
        tipo: 'disciplina',
        disciplina: selectedDisciplina,
        turmas: dadosTurmas,
        stats: {
          cv_positivas: ((standardDeviation(percentPositivos) / mean(percentPositivos)) * 100),
          mean_positivas: mean(percentPositivos),
          std_positivas: standardDeviation(percentPositivos),
          min_positivas: Math.min(...percentPositivos),
          max_positivas: Math.max(...percentPositivos),
          cv_medias: ((standardDeviation(medias) / mean(medias)) * 100),
          mean_medias: mean(medias),
          std_medias: standardDeviation(medias),
          min_medias: Math.min(...medias),
          max_medias: Math.max(...medias)
        }
      };
    } else {
      // Análise geral (todas as disciplinas, agregado por turma)
      const porTurma = {};
      
      filtrados.forEach(av => {
        if (!porTurma[av.turma]) {
          porTurma[av.turma] = {
            percentPositivos: [],
            medias: []
          };
        }
        porTurma[av.turma].percentPositivos.push(av.percent_positivos || 0);
        porTurma[av.turma].medias.push(av.media_calculada);
      });

      const turmasAgregadas = Object.entries(porTurma).map(([turma, dados]) => ({
        turma,
        percentPositivos: mean(dados.percentPositivos),
        media: mean(dados.medias),
        numDisciplinas: dados.percentPositivos.length
      }));

      if (turmasAgregadas.length < 2) return null;

      const percentPositivos = turmasAgregadas.map(t => t.percentPositivos);
      const medias = turmasAgregadas.map(t => t.media);

      return {
        tipo: 'geral',
        turmas: turmasAgregadas,
        stats: {
          cv_positivas: ((standardDeviation(percentPositivos) / mean(percentPositivos)) * 100),
          mean_positivas: mean(percentPositivos),
          std_positivas: standardDeviation(percentPositivos),
          min_positivas: Math.min(...percentPositivos),
          max_positivas: Math.max(...percentPositivos),
          cv_medias: ((standardDeviation(medias) / mean(medias)) * 100),
          mean_medias: mean(medias),
          std_medias: standardDeviation(medias),
          min_medias: Math.min(...medias),
          max_medias: Math.max(...medias)
        }
      };
    }
  }, [avaliacoesComMedia, selectedAnoLetivo, selectedAnoEscolar, selectedDisciplina]);

  // New: Calculate discipline evolution across academic years - memoized
  const disciplinaEvolucaoPorAno = useMemo(() => {
    if (!selectedAnoEscolarComparacao || !selectedDisciplinaComparacao) return null;

    const filtrados = avaliacoesComMedia.filter(
      av => av.ano === selectedAnoEscolarComparacao && av.disciplina === selectedDisciplinaComparacao
    );

    if (filtrados.length === 0) return null;

    const porAnoLetivo = {};
    filtrados.forEach(av => {
      if (!porAnoLetivo[av.ano_letivo]) {
        porAnoLetivo[av.ano_letivo] = {
          medias: [],
          percentPositivos: []
        };
      }
      porAnoLetivo[av.ano_letivo].medias.push(av.media_calculada);
      porAnoLetivo[av.ano_letivo].percentPositivos.push(av.percent_positivos || 0);
    });

    return Object.entries(porAnoLetivo)
      .map(([anoLetivo, dados]) => ({
        anoLetivo,
        mean_media: mean(dados.medias),
        mean_percent_positivos: mean(dados.percentPositivos),
        count: dados.medias.length
      }))
      .sort((a, b) => a.anoLetivo.localeCompare(b.anoLetivo));
  }, [avaliacoesComMedia, selectedAnoEscolarComparacao, selectedDisciplinaComparacao]);

  const getCVColor = (cv) => {
    const cvNum = Number(cv);
    if (cvNum > 20) return '#ef4444';
    if (cvNum > 10) return '#f59e0b';
    return '#10b981';
  };

  const getCVInterpretacao = (cv) => {
    const cvNum = Number(cv);
    if (cvNum > 20) return 'Alta heterogeneidade';
    if (cvNum > 10) return 'Média heterogeneidade';
    return 'Baixa heterogeneidade';
  };

  const formatNumber = (num, decimals = 2) => {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    return num.toFixed(decimals);
  };

  return (
    <div className="space-y-8">
      {/* Seção 1: Visão Geral por Ano Letivo */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">
          📊 Heterogeneidade entre Turmas por Ano Letivo (Geral)
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Análise geral do equilíbrio entre todas as turmas de cada ano letivo. 
          <strong> CV &lt; 10% = baixa heterogeneidade</strong> (turmas bem equilibradas).
        </p>

        {cvPorAnoLetivo && cvPorAnoLetivo.length > 0 ? (
          <>
            {/* Tabela de CV */}
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ano Letivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CV % Positivas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Média % Positivas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      CV Médias
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Média Geral
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Interpretação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nº Registos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cvPorAnoLetivo.map((item) => (
                    <tr key={item.anoLetivo} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.anoLetivo}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: getCVColor(item.cv_positivas) }}>
                        {formatNumber(item.cv_positivas)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatNumber(item.mean_positivas)}%
                      </td>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: getCVColor(item.cv_medias) }}>
                        {formatNumber(item.cv_medias)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatNumber(item.mean_medias)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getCVInterpretacao(Math.max(Number(item.cv_positivas), Number(item.cv_medias)))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráfico de Barras */}
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={cvPorAnoLetivo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="anoLetivo" />
                <YAxis label={{ value: 'CV (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${formatNumber(value)}%`} />
                <Legend />
                <Bar dataKey="cv_positivas" name="CV % Positivas" fill={colors[0]} />
                <Bar dataKey="cv_medias" name="CV Médias" fill={colors[1]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-center text-gray-500 py-12">
            Sem dados suficientes para análise de heterogeneidade. São necessárias pelo menos 2 turmas/registos por ano letivo.
          </p>
        )}
      </div>

      {/* Seção 2: Análise Detalhada: Comparação entre Turmas */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">
          🔍 Análise Detalhada: Comparação entre Turmas
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Selecione os filtros para comparar turmas específicas de um mesmo ano escolar.
          Pode analisar por disciplina individual ou visão geral (agregado de todas as disciplinas).
        </p>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Ano Letivo: <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAnoLetivo}
              onChange={(e) => {
                setSelectedAnoLetivo(e.target.value);
                setSelectedAnoEscolar('');
                setSelectedDisciplina('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {anosLetivosUnicos.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Ano Escolar: <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAnoEscolar}
              onChange={(e) => {
                setSelectedAnoEscolar(e.target.value);
                setSelectedDisciplina('');
              }}
              disabled={!selectedAnoLetivo}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione...</option>
              {selectedAnoLetivo && [...new Set(avaliacoes.filter(av => av.ano_letivo === selectedAnoLetivo).map(av => av.ano))].sort().map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              3. Disciplina (opcional):
            </label>
            <select
              value={selectedDisciplina}
              onChange={(e) => setSelectedDisciplina(e.target.value)}
              disabled={!selectedAnoEscolar}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Todas (visão geral)</option>
              {selectedAnoLetivo && selectedAnoEscolar && [...new Set(avaliacoes.filter(av => av.ano_letivo === selectedAnoLetivo && av.ano === selectedAnoEscolar).map(av => av.disciplina))].sort().map(disc => (
                <option key={disc} value={disc}>{disc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados da Análise */}
        {analiseDetalhada ? (
          <div className="space-y-6">
            {/* Cabeçalho do Contexto */}
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                {analiseDetalhada.tipo === 'disciplina' 
                  ? `📚 ${selectedAnoLetivo} | ${selectedAnoEscolar} | ${analiseDetalhada.disciplina}`
                  : `📚 ${selectedAnoLetivo} | ${selectedAnoEscolar} | Visão Geral (Agregado)`
                }
              </h3>
              <p className="text-sm text-indigo-700">
                {analiseDetalhada.tipo === 'disciplina'
                  ? 'Comparação de turmas numa disciplina específica'
                  : 'Média de todas as disciplinas por turma'
                }
              </p>
            </div>

            {/* Estatísticas Resumidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* % Positivas */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-purple-600">📊</span> % de Positivas
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coeficiente de Variação:</span>
                    <span className="font-bold" style={{ color: getCVColor(analiseDetalhada.stats.cv_positivas) }}>
                      {formatNumber(analiseDetalhada.stats.cv_positivas)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interpretação:</span>
                    <span className="font-semibold text-gray-700">
                      {getCVInterpretacao(analiseDetalhada.stats.cv_positivas)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Média:</span>
                    <span className="font-semibold text-gray-700">{formatNumber(analiseDetalhada.stats.mean_positivas)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desvio Padrão:</span>
                    <span className="text-gray-600">{formatNumber(analiseDetalhada.stats.std_positivas)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amplitude:</span>
                    <span className="text-gray-600">
                      {formatNumber(analiseDetalhada.stats.min_positivas)}% - {formatNumber(analiseDetalhada.stats.max_positivas)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Médias Calculadas */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="text-green-600">📈</span> Médias Calculadas
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Coeficiente de Variação:</span>
                    <span className="font-bold" style={{ color: getCVColor(analiseDetalhada.stats.cv_medias) }}>
                      {formatNumber(analiseDetalhada.stats.cv_medias)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interpretação:</span>
                    <span className="font-semibold text-gray-700">
                      {getCVInterpretacao(analiseDetalhada.stats.cv_medias)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Média:</span>
                    <span className="font-semibold text-gray-700">{formatNumber(analiseDetalhada.stats.mean_medias)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desvio Padrão:</span>
                    <span className="text-gray-600">{formatNumber(analiseDetalhada.stats.std_medias)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amplitude:</span>
                    <span className="text-gray-600">
                      {formatNumber(analiseDetalhada.stats.min_medias)} - {formatNumber(analiseDetalhada.stats.max_medias)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Turmas */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Turma
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      % Positivas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Média Calculada
                    </th>
                    {analiseDetalhada.tipo === 'disciplina' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nº Alunos
                      </th>
                    )}
                    {analiseDetalhada.tipo === 'geral' && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nº Disciplinas
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analiseDetalhada.turmas.map((turma, idx) => (
                    <tr key={turma.turma} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {turma.turma}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {turma.percentPositivos.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {turma.media.toFixed(2)}
                      </td>
                      {analiseDetalhada.tipo === 'disciplina' && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {turma.totalAlunos}
                        </td>
                      )}
                      {analiseDetalhada.tipo === 'geral' && (
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {turma.numDisciplinas}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráficos Comparativos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico % Positivas */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 text-center">
                  Comparação: % Positivas por Turma
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analiseDetalhada.turmas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="turma" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${formatNumber(value)}%`} />
                    <Bar dataKey="percentPositivos" name="% Positivas">
                      {analiseDetalhada.turmas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico Médias */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 text-center">
                  Comparação: Médias Calculadas por Turma
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analiseDetalhada.turmas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="turma" />
                    <YAxis domain={[0, 'auto']} />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Bar dataKey="media" name="Média Calculada">
                      {analiseDetalhada.turmas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : selectedAnoLetivo && selectedAnoEscolar ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Sem dados suficientes para análise. São necessárias pelo menos 2 turmas.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">
              👆 Selecione um <strong>Ano Letivo</strong> e <strong>Ano Escolar</strong> para começar a análise
            </p>
          </div>
        )}
      </div>

      {/* Seção 3: Evolução de Disciplina ao Longo dos Anos */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">
          📈 Evolução de Disciplina ao Longo dos Anos
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Compare o desempenho médio de uma disciplina num ano escolar selecionado, através de diferentes anos letivos.
        </p>

        {/* Filtros para Comparação entre Anos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              1. Ano Escolar: <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAnoEscolarComparacao}
              onChange={(e) => {
                setSelectedAnoEscolarComparacao(e.target.value);
                setSelectedDisciplinaComparacao('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {anosEscolaresUnicos.map(ano => (
                <option key={ano} value={ano}>{ano}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Disciplina: <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedDisciplinaComparacao}
              onChange={(e) => setSelectedDisciplinaComparacao(e.target.value)}
              disabled={!selectedAnoEscolarComparacao}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Selecione...</option>
              {selectedAnoEscolarComparacao && [...new Set(avaliacoes.filter(av => av.ano === selectedAnoEscolarComparacao).map(av => av.disciplina))].sort().map(disc => (
                <option key={disc} value={disc}>{disc}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Resultados da Evolução da Disciplina */}
        {disciplinaEvolucaoPorAno && disciplinaEvolucaoPorAno.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded">
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Evolução para {selectedDisciplinaComparacao} ({selectedAnoEscolarComparacao})
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Linhas - Média Calculada */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 text-center">
                  Média Calculada por Ano Letivo
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={disciplinaEvolucaoPorAno}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="anoLetivo" />
                    <YAxis domain={[0, 'auto']} />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="mean_media" stroke={colors[0]} name="Média Calculada" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Linhas - % Positivas */}
              <div>
                <h4 className="text-md font-semibold text-gray-800 mb-3 text-center">
                  % Positivas por Ano Letivo
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={disciplinaEvolucaoPorAno}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="anoLetivo" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${formatNumber(value)}%`} />
                    <Legend />
                    <Line type="monotone" dataKey="mean_percent_positivos" stroke={colors[1]} name="% Positivas" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de Evolução */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ano Letivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Média Calculada
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      % Positivas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nº Registos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {disciplinaEvolucaoPorAno.map((item) => (
                    <tr key={item.anoLetivo} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.anoLetivo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatNumber(item.mean_media)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatNumber(item.mean_percent_positivos)}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedAnoEscolarComparacao && selectedDisciplinaComparacao ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Sem dados disponíveis para a disciplina selecionada neste ano escolar.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400">
              👆 Selecione um <strong>Ano Escolar</strong> e uma <strong>Disciplina</strong> para ver a sua evolução.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TurmasTab;
