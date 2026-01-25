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

const EvolucaoTab = ({ avaliacoes = [] }) => {
  const [selectedAnoLetivo1, setSelectedAnoLetivo1] = useState('');
  const [selectedAnoEscolar1, setSelectedAnoEscolar1] = useState('');
  const [selectedAnoLetivo2, setSelectedAnoLetivo2] = useState('');
  const [selectedAnoEscolar2, setSelectedAnoEscolar2] = useState('');
  const [viewMode, setViewMode] = useState('percentual'); // 'percentual' ou 'absoluto'

  // Extrair listas únicas
  const anosLetivosUnicos = useMemo(() => 
    [...new Set(avaliacoes.map(av => av.ano_letivo))].sort(), 
    [avaliacoes]
  );

  const anosEscolaresUnicos1 = useMemo(() => 
    selectedAnoLetivo1 
      ? [...new Set(avaliacoes.filter(av => av.ano_letivo === selectedAnoLetivo1).map(av => av.ano))].sort()
      : [],
    [avaliacoes, selectedAnoLetivo1]
  );

  const anosEscolaresUnicos2 = useMemo(() => 
    selectedAnoLetivo2 
      ? [...new Set(avaliacoes.filter(av => av.ano_letivo === selectedAnoLetivo2).map(av => av.ano))].sort()
      : [],
    [avaliacoes, selectedAnoLetivo2]
  );

  // Função para processar dados de um filtro específico
  const processarDados = (anoLetivo, anoEscolar) => {
    if (!anoLetivo || !anoEscolar) return null;

    const filtrados = avaliacoes.filter(
      av => av.ano_letivo === anoLetivo && av.ano === anoEscolar
    );

    if (filtrados.length === 0) return null;

    const ciclo = filtrados[0]?.ciclo;
    const porDisciplina = {};
    
    filtrados.forEach(av => {
      const disc = av.disciplina;
      if (!porDisciplina[disc]) {
        porDisciplina[disc] = {
          disciplina: disc,
          totalAlunos: 0,
          classificacoes: {}
        };
      }

      porDisciplina[disc].totalAlunos += av.total_alunos || 0;
      
      const classif = av.classificacoes || {};
      Object.entries(classif).forEach(([nivel, count]) => {
        if (!porDisciplina[disc].classificacoes[nivel]) {
          porDisciplina[disc].classificacoes[nivel] = 0;
        }
        porDisciplina[disc].classificacoes[nivel] += count || 0;
      });
    });

    // Preparar dados para gráficos
    const dados = Object.values(porDisciplina).map(disc => {
      const classif = disc.classificacoes;
      const total = disc.totalAlunos;

      if (ciclo === '1_ciclo') {
        const I_val = classif.I || 0;
        const S_val = classif.S || 0;
        const B_val = classif.B || 0;
        const MB_val = classif.MB || 0;
        
        // Calcular percentagens
        let I_pct = total > 0 ? Number(((I_val / total) * 100).toFixed(2)) : 0;
        let S_pct = total > 0 ? Number(((S_val / total) * 100).toFixed(2)) : 0;
        let B_pct = total > 0 ? Number(((B_val / total) * 100).toFixed(2)) : 0;
        let MB_pct = total > 0 ? Number(((MB_val / total) * 100).toFixed(2)) : 0;
        
        // Ajustar última categoria para garantir 100%
        const soma = I_pct + S_pct + B_pct + MB_pct;
        if (soma !== 100 && total > 0) {
          MB_pct = Number((100 - I_pct - S_pct - B_pct).toFixed(2));
        }
        
        const result = {
          disciplina: disc.disciplina,
          I: I_val,
          S: S_val,
          B: B_val,
          MB: MB_val,
          I_pct: I_pct,
          S_pct: S_pct,
          B_pct: B_pct,
          MB_pct: MB_pct,
          total: total
        };
        
        return result;
      } else if (ciclo === '2_ciclo' || ciclo === '3_ciclo') {
        const n1 = classif['1'] || 0;
        const n2 = classif['2'] || 0;
        const n3 = classif['3'] || 0;
        const n4 = classif['4'] || 0;
        const n5 = classif['5'] || 0;
        
        // Calcular percentagens
        let n1_pct = total > 0 ? Number(((n1 / total) * 100).toFixed(2)) : 0;
        let n2_pct = total > 0 ? Number(((n2 / total) * 100).toFixed(2)) : 0;
        let n3_pct = total > 0 ? Number(((n3 / total) * 100).toFixed(2)) : 0;
        let n4_pct = total > 0 ? Number(((n4 / total) * 100).toFixed(2)) : 0;
        let n5_pct = total > 0 ? Number(((n5 / total) * 100).toFixed(2)) : 0;
        
        // Ajustar última categoria para garantir 100%
        const soma = n1_pct + n2_pct + n3_pct + n4_pct + n5_pct;
        if (soma !== 100 && total > 0) {
          n5_pct = Number((100 - n1_pct - n2_pct - n3_pct - n4_pct).toFixed(2));
        }
        
        const result = {
          disciplina: disc.disciplina,
          1: n1,
          2: n2,
          3: n3,
          4: n4,
          5: n5,
          '1_pct': n1_pct,
          '2_pct': n2_pct,
          '3_pct': n3_pct,
          '4_pct': n4_pct,
          '5_pct': n5_pct,
          total: total
        };

        return result;
      } else if (ciclo === 'secundario') {
        const v07 = classif['1_7'] || 0;
        const v89 = classif['8_9'] || 0;
        const v1013 = classif['10_13'] || 0;
        const v1417 = classif['14_17'] || 0;
        const v1820 = classif['18_20'] || 0;
        
        // Calcular percentagens
        let v07_pct = total > 0 ? Number(((v07 / total) * 100).toFixed(2)) : 0;
        let v89_pct = total > 0 ? Number(((v89 / total) * 100).toFixed(2)) : 0;
        let v1013_pct = total > 0 ? Number(((v1013 / total) * 100).toFixed(2)) : 0;
        let v1417_pct = total > 0 ? Number(((v1417 / total) * 100).toFixed(2)) : 0;
        let v1820_pct = total > 0 ? Number(((v1820 / total) * 100).toFixed(2)) : 0;
        
        // Ajustar última categoria para garantir 100%
        const soma = v07_pct + v89_pct + v1013_pct + v1417_pct + v1820_pct;
        if (soma !== 100 && total > 0) {
          v1820_pct = Number((100 - v07_pct - v89_pct - v1013_pct - v1417_pct).toFixed(2));
        }
        
        const result = {
          disciplina: disc.disciplina,
          '0-7': v07,
          '8-9': v89,
          '10-13': v1013,
          '14-17': v1417,
          '18-20': v1820,
          '0-7_pct': v07_pct,
          '8-9_pct': v89_pct,
          '10-13_pct': v1013_pct,
          '14-17_pct': v1417_pct,
          '18-20_pct': v1820_pct,
          total: total
        };

        return result;
      }

      return null;
    }).filter(Boolean);

    dados.sort((a, b) => a.disciplina.localeCompare(b.disciplina));

    return { dados, ciclo };
  };

  const dadosProcessados1 = processarDados(selectedAnoLetivo1, selectedAnoEscolar1);
  const dadosProcessados2 = processarDados(selectedAnoLetivo2, selectedAnoEscolar2);

  // Calcular % positivos (sempre soma 100%)
  const calcularSuccesso = (dadosProc) => {
    if (!dadosProc) return null;

    const { dados, ciclo } = dadosProc;

    return dados.map(disc => {
      let positivos = 0;
      const total = disc.total;

      if (ciclo === '1_ciclo') {
        positivos = (disc.S || 0) + (disc.B || 0) + (disc.MB || 0);
      } else if (ciclo === '2_ciclo' || ciclo === '3_ciclo') {
        positivos = (disc['3'] || 0) + (disc['4'] || 0) + (disc['5'] || 0);
      } else if (ciclo === 'secundario') {
        positivos = (disc['10-13'] || 0) + (disc['14-17'] || 0) + (disc['18-20'] || 0);
      }

      const positivosPct = total > 0 ? Number(((positivos / total) * 100).toFixed(1)) : 0;
      const negativosPct = Number((100 - positivosPct).toFixed(1));

      return {
        disciplina: disc.disciplina,
        'Positivos': positivosPct,
        'Negativos': negativosPct,
        total: total
      };
    });
  };

  const dadosSuccesso1 = calcularSuccesso(dadosProcessados1);
  const dadosSuccesso2 = calcularSuccesso(dadosProcessados2);

  // Paleta de cores melhorada para qualidade do sucesso
  const coresQualidade = {
    // 1º Ciclo - gradiente de vermelho a verde
    'I': '#dc2626',      // Vermelho escuro (Insuficiente)
    'S': '#fbbf24',      // Amarelo (Suficiente)
    'B': '#3b82f6',      // Azul (Bom)
    'MB': '#16a34a',     // Verde escuro (Muito Bom)

    // 2º e 3º Ciclos - gradiente progressivo
    '1': '#dc2626',      // Vermelho escuro
    '2': '#f87171',      // Vermelho claro
    '3': '#fbbf24',      // Amarelo
    '4': '#3b82f6',      // Azul
    '5': '#16a34a',      // Verde escuro

    // Secundário - gradiente de vermelho a verde
    '0-7': '#dc2626',    // Vermelho escuro
    '8-9': '#f97316',    // Laranja
    '10-13': '#fbbf24',  // Amarelo
    '14-17': '#3b82f6',  // Azul
    '18-20': '#16a34a',  // Verde escuro
  };

  const coresSuccesso = {
    'Positivos': '#10b981',  // Verde
    'Negativos': '#ef4444',  // Vermelho
  };

  const renderGraficoSucesso = (dadosSuccesso, anoLetivo, anoEscolar, titulo) => {
    if (!dadosSuccesso) return null;

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {titulo}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {anoEscolar} ({anoLetivo})
        </p>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '600px' }}>
            <ResponsiveContainer width="100%" height={Math.max(400, dadosSuccesso.length * 35)}>
              <BarChart 
                data={dadosSuccesso} 
                layout="vertical"
                margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
              >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, 100]}
              label={{ value: '%', position: 'insideRight' }}
            />
            <YAxis 
              type="category" 
              dataKey="disciplina" 
              width={140}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value) => `${value}%`}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend />
            <Bar 
              dataKey="Positivos" 
              stackId="a" 
              fill={coresSuccesso['Positivos']}
              name="% Positivos"
            />
            <Bar 
              dataKey="Negativos" 
              stackId="a" 
              fill={coresSuccesso['Negativos']}
              name="% Negativos"
            />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const renderGraficoQualidade = (dadosProc, anoLetivo, anoEscolar, titulo) => {
    if (!dadosProc) return null;

    const { dados, ciclo } = dadosProc;
    const suffix = viewMode === 'percentual' ? '_pct' : '';

    let barras = [];
    
    if (ciclo === '1_ciclo') {
      barras = [
        { key: `I${suffix}`, name: 'I (Insuficiente)', color: coresQualidade['I'] },
        { key: `S${suffix}`, name: 'S (Suficiente)', color: coresQualidade['S'] },
        { key: `B${suffix}`, name: 'B (Bom)', color: coresQualidade['B'] },
        { key: `MB${suffix}`, name: 'MB (Muito Bom)', color: coresQualidade['MB'] },
      ];
    } else if (ciclo === '2_ciclo' || ciclo === '3_ciclo') {
      barras = [
        { key: `1${suffix}`, name: '1', color: coresQualidade['1'] },
        { key: `2${suffix}`, name: '2', color: coresQualidade['2'] },
        { key: `3${suffix}`, name: '3', color: coresQualidade['3'] },
        { key: `4${suffix}`, name: '4', color: coresQualidade['4'] },
        { key: `5${suffix}`, name: '5', color: coresQualidade['5'] },
      ];
    } else if (ciclo === 'secundario') {
      barras = [
        { key: `0-7${suffix}`, name: '0-7', color: coresQualidade['0-7'] },
        { key: `8-9${suffix}`, name: '8-9', color: coresQualidade['8-9'] },
        { key: `10-13${suffix}`, name: '10-13', color: coresQualidade['10-13'] },
        { key: `14-17${suffix}`, name: '14-17', color: coresQualidade['14-17'] },
        { key: `18-20${suffix}`, name: '18-20', color: coresQualidade['18-20'] },
      ];
    }

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {titulo}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Classificações por disciplina no {anoEscolar} ({anoLetivo})
          <span className="ml-4 font-semibold text-gray-700">
            Escala: {viewMode === 'percentual' ? 'Percentual (%)' : 'Valores Absolutos (Nº Alunos)'}
          </span>
        </p>

        <div className="overflow-x-auto">
          <div style={{ minWidth: '600px' }}>
            <ResponsiveContainer width="100%" height={Math.max(400, dados.length * 35)}>
              <BarChart 
                data={dados} 
                layout="vertical"
                margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
              >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, viewMode === 'percentual' ? 100 : 'auto']}
              tickFormatter={(value) => viewMode === 'percentual' ? Math.round(value) : value}
            />
            <YAxis 
              type="category" 
              dataKey="disciplina" 
              width={140}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value) => {
                if (viewMode === 'percentual') {
                  return `${Number(value).toFixed(1)}%`;
                } else {
                  return `${value} alunos`;
                }
              }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend />
            {barras.map(barra => (
              <Bar 
                key={barra.key} 
                dataKey={barra.key} 
                stackId="a" 
                fill={barra.color}
                name={barra.name}
              />
            ))}
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-indigo-900 mb-4">
          📊 Análise Comparativa de Classificações
        </h2>
        <p className="text-gray-600 mb-6 text-sm">
          Compare a distribuição de classificações e taxa de sucesso entre dois anos letivos diferentes.
        </p>

        {/* Filtros lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Filtros Gráfico 1 */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">📍 Gráfico 1</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano Letivo: <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAnoLetivo1}
                  onChange={(e) => {
                    setSelectedAnoLetivo1(e.target.value);
                    setSelectedAnoEscolar1('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {anosLetivosUnicos.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano Escolar: <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAnoEscolar1}
                  onChange={(e) => setSelectedAnoEscolar1(e.target.value)}
                  disabled={!selectedAnoLetivo1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione...</option>
                  {anosEscolaresUnicos1.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Filtros Gráfico 2 */}
          <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-3">📍 Gráfico 2 (Comparação)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano Letivo:
                </label>
                <select
                  value={selectedAnoLetivo2}
                  onChange={(e) => {
                    setSelectedAnoLetivo2(e.target.value);
                    setSelectedAnoEscolar2('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Selecione...</option>
                  {anosLetivosUnicos.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano Escolar:
                </label>
                <select
                  value={selectedAnoEscolar2}
                  onChange={(e) => setSelectedAnoEscolar2(e.target.value)}
                  disabled={!selectedAnoLetivo2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione...</option>
                  {anosEscolaresUnicos2.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modo de Visualização */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de Visualização (Qualidade do Sucesso):
          </label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="percentual">Percentual (%)</option>
            <option value="absoluto">Valores Absolutos</option>
          </select>
        </div>
      </div>

      {/* Avisos quando não há seleção */}
      {(!selectedAnoLetivo1 || !selectedAnoEscolar1) && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-400">
            👆 Selecione pelo menos o <strong>Gráfico 1</strong> (Ano Letivo e Ano Escolar) para visualizar os dados
          </p>
        </div>
      )}

      {/* Seção I: Sucesso */}
      {(dadosSuccesso1 || dadosSuccesso2) && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            I. Sucesso por Ano Escolar
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {dadosSuccesso1 && renderGraficoSucesso(
              dadosSuccesso1, 
              selectedAnoLetivo1, 
              selectedAnoEscolar1,
              `I. Sucesso ${selectedAnoEscolar1}`
            )}
            {dadosSuccesso2 && renderGraficoSucesso(
              dadosSuccesso2, 
              selectedAnoLetivo2, 
              selectedAnoEscolar2,
              `I. Sucesso ${selectedAnoEscolar2}`
            )}
          </div>
        </div>
      )}

      {/* Seção II: Qualidade do Sucesso */}
      {(dadosProcessados1 || dadosProcessados2) && (
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            II. Qualidade do Sucesso
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {dadosProcessados1 && renderGraficoQualidade(
              dadosProcessados1,
              selectedAnoLetivo1,
              selectedAnoEscolar1,
              `II. Qualidade do Sucesso - ${selectedAnoEscolar1}`
            )}
            {dadosProcessados2 && renderGraficoQualidade(
              dadosProcessados2,
              selectedAnoLetivo2,
              selectedAnoEscolar2,
              `II. Qualidade do Sucesso - ${selectedAnoEscolar2}`
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvolucaoTab;
