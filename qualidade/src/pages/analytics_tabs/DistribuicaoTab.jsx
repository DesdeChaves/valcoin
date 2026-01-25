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
} from 'recharts';

const DistribuicaoTab = ({ avaliacoes = [] }) => {
  const [selectedCiclo, setSelectedCiclo] = useState('');
  const [viewMode, setViewMode] = useState('absoluto'); // 'absoluto' ou 'percentual'

  // Extrair ciclos únicos
  const ciclosUnicos = useMemo(() => 
    [...new Set(avaliacoes.map(av => av.ciclo))].filter(Boolean).sort(),
    [avaliacoes]
  );

  // Mapear nomes de ciclos
  const cicloNomes = {
    '1_ciclo': '1º Ciclo',
    '2_ciclo': '2º Ciclo',
    '3_ciclo': '3º Ciclo',
    'secundario': 'Secundário'
  };

  // Paleta de cores por nível
  const coresNiveis = {
    // 1º Ciclo
    'I': '#dc2626',
    'S': '#fbbf24',
    'B': '#3b82f6',
    'MB': '#16a34a',
    // 2º e 3º Ciclos
    '1': '#dc2626',
    '2': '#f87171',
    '3': '#fbbf24',
    '4': '#3b82f6',
    '5': '#16a34a',
    // Secundário
    '1_7': '#dc2626',
    '8_9': '#f97316',
    '10_13': '#fbbf24',
    '14_17': '#3b82f6',
    '18_20': '#16a34a',
  };

  // Ordem correta dos níveis por ciclo
  const ordemNiveis = {
    '1_ciclo': ['I', 'S', 'B', 'MB'],
    '2_ciclo': ['1', '2', '3', '4', '5'],
    '3_ciclo': ['1', '2', '3', '4', '5'],
    'secundario': ['1_7', '8_9', '10_13', '14_17', '18_20']
  };

  // Labels amigáveis para níveis
  const labelsNiveis = {
    'I': 'Insuficiente',
    'S': 'Suficiente',
    'B': 'Bom',
    'MB': 'Muito Bom',
    '1': 'Nível 1',
    '2': 'Nível 2',
    '3': 'Nível 3',
    '4': 'Nível 4',
    '5': 'Nível 5',
    '1_7': '0-7',
    '8_9': '8-9',
    '10_13': '10-13',
    '14_17': '14-17',
    '18_20': '18-20'
  };

  // Processar distribuição por ano letivo e ciclo
  const distribuicaoPorAnoLetivo = useMemo(() => {
    const porCiclo = {};

    avaliacoes.forEach(av => {
      const ciclo = av.ciclo;
      const anoLetivo = av.ano_letivo;

      if (!ciclo || !anoLetivo) return;

      if (!porCiclo[ciclo]) {
        porCiclo[ciclo] = {};
      }

      if (!porCiclo[ciclo][anoLetivo]) {
        porCiclo[ciclo][anoLetivo] = {};
      }

      const classif = av.classificacoes || {};
      Object.entries(classif).forEach(([nivel, count]) => {
        if (!porCiclo[ciclo][anoLetivo][nivel]) {
          porCiclo[ciclo][anoLetivo][nivel] = 0;
        }
        porCiclo[ciclo][anoLetivo][nivel] += count || 0;
      });
    });

    return porCiclo;
  }, [avaliacoes]);

  // Preparar dados para gráficos do ciclo selecionado
  const dadosGraficos = useMemo(() => {
    if (!selectedCiclo || !distribuicaoPorAnoLetivo[selectedCiclo]) return null;

    const dadosCiclo = distribuicaoPorAnoLetivo[selectedCiclo];
    const anosLetivos = Object.keys(dadosCiclo).sort();
    const niveisOrdenados = ordemNiveis[selectedCiclo] || [];

    // Dados absolutos por ano letivo
    const dadosAbsolutos = anosLetivos.map(ano => {
      const obj = { anoLetivo: ano };
      let total = 0;
      
      niveisOrdenados.forEach(nivel => {
        const valor = dadosCiclo[ano][nivel] || 0;
        obj[nivel] = valor;
        total += valor;
      });
      
      obj.total = total;
      return obj;
    });

    // Dados percentuais por ano letivo
    const dadosPercentuais = dadosAbsolutos.map(ano => {
      const obj = { anoLetivo: ano.anoLetivo };
      const total = ano.total;
      
      niveisOrdenados.forEach((nivel, index) => {
        const valor = ano[nivel] || 0;
        let pct = total > 0 ? Number(((valor / total) * 100).toFixed(2)) : 0;
        
        // Ajustar último para somar 100%
        if (index === niveisOrdenados.length - 1 && total > 0) {
          const somaParcial = niveisOrdenados
            .slice(0, -1)
            .reduce((sum, n) => sum + (obj[n] || 0), 0);
          pct = Number((100 - somaParcial).toFixed(2));
        }
        
        obj[nivel] = pct;
      });
      
      obj.total = total;
      return obj;
    });

    return {
      absolutos: dadosAbsolutos,
      percentuais: dadosPercentuais,
      niveis: niveisOrdenados
    };
  }, [selectedCiclo, distribuicaoPorAnoLetivo]);

  // Comparação percentual entre anos letivos
  const dadosComparacao = useMemo(() => {
    if (!dadosGraficos) return null;

    const { niveis } = dadosGraficos;
    const anosLetivos = dadosGraficos.absolutos.map(d => d.anoLetivo);

    // Transformar dados para comparação lado a lado
    return niveis.map(nivel => {
      const obj = { nivel: labelsNiveis[nivel] || nivel };
      
      anosLetivos.forEach(ano => {
        const dadosAno = dadosGraficos.percentuais.find(d => d.anoLetivo === ano);
        obj[ano] = dadosAno ? dadosAno[nivel] : 0;
      });
      
      return obj;
    });
  }, [dadosGraficos]);

  const renderGraficoDistribuicao = () => {
    if (!dadosGraficos) return null;

    const dados = viewMode === 'absoluto' ? dadosGraficos.absolutos : dadosGraficos.percentuais;
    const { niveis } = dadosGraficos;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Distribuição de Classificações por Ano Letivo
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {cicloNomes[selectedCiclo]} - {viewMode === 'absoluto' ? 'Valores Absolutos (Nº Alunos)' : 'Percentual (%)'}
        </p>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '600px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="anoLetivo" />
                <YAxis 
                  tickFormatter={(value) => viewMode === 'percentual' ? Math.round(value) : value}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    const label = labelsNiveis[name] || name;
                    if (viewMode === 'percentual') {
                      return [`${Number(value).toFixed(1)}%`, label];
                    }
                    return [`${value} alunos`, label];
                  }}
                />
                <Legend 
                  formatter={(value) => labelsNiveis[value] || value}
                />
                {niveis.map((nivel) => (
                  <Bar 
                    key={nivel}
                    dataKey={nivel}
                    stackId="a"
                    fill={coresNiveis[nivel] || '#6b7280'}
                    name={nivel}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de dados */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Ano Letivo
                </th>
                {niveis.map(nivel => (
                  <th key={nivel} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {labelsNiveis[nivel] || nivel}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dados.map((ano, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {ano.anoLetivo}
                  </td>
                  {niveis.map(nivel => (
                    <td key={nivel} className="px-4 py-3 text-sm text-gray-700">
                      {viewMode === 'absoluto' 
                        ? ano[nivel] 
                        : `${Number(ano[nivel]).toFixed(1)}%`
                      }
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {viewMode === 'absoluto' ? ano.total : '100%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderGraficoComparacao = () => {
    if (!dadosComparacao || dadosGraficos.absolutos.length < 2) return null;

    const anosLetivos = dadosGraficos.absolutos.map(d => d.anoLetivo);
    const cores = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          Comparação Percentual entre Anos Letivos
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {cicloNomes[selectedCiclo]} - Evolução da distribuição ao longo dos anos
        </p>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '600px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={dadosComparacao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nivel" />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => Math.round(value)}
                />
                <Tooltip 
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <Legend />
                {anosLetivos.map((ano, index) => (
                  <Bar 
                    key={ano}
                    dataKey={ano}
                    fill={cores[index % cores.length]}
                    name={ano}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de comparação */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nível
                </th>
                {anosLetivos.map(ano => (
                  <th key={ano} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {ano}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dadosComparacao.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {row.nivel}
                  </td>
                  {anosLetivos.map(ano => (
                    <td key={ano} className="px-4 py-3 text-sm text-gray-700">
                      {Number(row[ano]).toFixed(1)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">
          📊 Distribuição de Classificações
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Analise a distribuição de classificações ao longo dos anos letivos, por ciclo de ensino.
          Compare populações diferentes usando percentagens.
        </p>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ciclo de Ensino: <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCiclo}
              onChange={(e) => setSelectedCiclo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione...</option>
              {ciclosUnicos.map(ciclo => (
                <option key={ciclo} value={ciclo}>
                  {cicloNomes[ciclo] || ciclo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modo de Visualização:
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              disabled={!selectedCiclo}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="absoluto">Valores Absolutos (Nº Alunos)</option>
              <option value="percentual">Percentual (%)</option>
            </select>
          </div>
        </div>

        {!selectedCiclo && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              👆 Selecione um <strong>Ciclo de Ensino</strong> para visualizar a distribuição
            </p>
          </div>
        )}
      </div>

      {/* Gráfico de Distribuição */}
      {renderGraficoDistribuicao()}

      {/* Gráfico de Comparação Percentual */}
      {renderGraficoComparacao()}
    </div>
  );
};

export default DistribuicaoTab;
