// src/pages/QuestionarioResultados.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale } from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { getAplicacaoById, getRespostasByAplicacao } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale);

const QuestionarioResultados = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [respostas, setRespostas] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        const [appData, respostasData] = await Promise.all([
          getAplicacaoById(id),
          getRespostasByAplicacao(id)
        ]);
        console.log('Dados da aplicação:', appData);
        console.log('Respostas recebidas:', respostasData);
        console.log('=== FRONTEND: Total de respostas:', respostasData.length);
        
        if (respostasData.length > 0) {
          console.log('=== FRONTEND: Primeira resposta completa:', JSON.stringify(respostasData[0], null, 2));
          
          if (respostasData[0].itens && respostasData[0].itens.length > 0) {
            console.log('=== FRONTEND: Total de itens na primeira resposta:', respostasData[0].itens.length);
            respostasData[0].itens.forEach((item, idx) => {
              console.log(`=== FRONTEND: Item ${idx}:`, {
                pergunta_id: item.pergunta_id,
                tipo: item.tipo,
                resposta_texto: item.resposta_texto,
                valor_numerico: item.valor_numerico,
                opcoes_selecionadas: item.opcoes_selecionadas
              });
            });
          }
        }
        
        setDados(appData);
        setRespostas(respostasData);
      } catch (err) {
        console.error(err);
        setErro('Erro ao carregar resultados');
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [id]);

  const numRespostas = respostas.length;
  const taxaResposta = dados?.total_destinatarios > 0
    ? Math.round((numRespostas / dados.total_destinatarios) * 100)
    : 0;

  // Função melhorada para obter valor da resposta
  const getRespostaValor = useCallback((item) => {
    console.log('=== getRespostaValor ===');
    console.log('Item completo:', JSON.stringify(item, null, 2));
    console.log('Tipo da pergunta:', item.tipo);
    console.log('valor_numerico:', item.valor_numerico, 'tipo:', typeof item.valor_numerico);
    
    // Texto curto/longo/email - ATENÇÃO: o campo é "resposta_texto" não "texto"
    if (item.resposta_texto !== null && item.resposta_texto !== undefined && item.resposta_texto !== '') {
      console.log('✓ Retornando resposta_texto:', item.resposta_texto);
      return item.resposta_texto;
    }
    
    // Também verificar o campo "texto" por compatibilidade
    if (item.texto !== null && item.texto !== undefined && item.texto !== '') {
      console.log('✓ Retornando texto:', item.texto);
      return item.texto;
    }
    
    // Opções selecionadas (radiobutton, checkbox, dropdown)
    if (item.opcoes_selecionadas && item.opcoes_selecionadas.length > 0) {
      // Usar opcoes_texto que vem do backend
      if (item.opcoes_texto && item.opcoes_texto.length > 0) {
        console.log('✓ Retornando opcoes_texto:', item.opcoes_texto);
        return item.opcoes_texto.join(', ');
      }
      // Fallback caso opcoes_texto não exista
      console.log('⚠ Opcoes sem texto, retornando contagem');
      return `${item.opcoes_selecionadas.length} opção(ões) selecionada(s)`;
    }
    
    // Valores numéricos (número, escala, likert)
    if (item.valor_numerico !== null && item.valor_numerico !== undefined) {
      console.log('✓ Retornando valor_numerico:', item.valor_numerico);
      return String(item.valor_numerico);
    }
    
    // Data
    if (item.valor_data) {
      console.log('✓ Retornando valor_data:', item.valor_data);
      return item.valor_data;
    }
    
    // Hora
    if (item.valor_hora) {
      console.log('✓ Retornando valor_hora:', item.valor_hora);
      return item.valor_hora;
    }
    
    // Ficheiros
    if (item.ficheiros_url && item.ficheiros_url.length > 0) {
      console.log('✓ Retornando ficheiros:', item.ficheiros_url.length);
      return `Ficheiros (${item.ficheiros_url.length})`;
    }
    
    console.log('✗ Sem resposta para item');
    return 'Sem resposta';
  }, []);

  // Dados agregados para gráficos
  const aggregatedPerguntasData = useMemo(() => {
    if (!dados?.perguntas || respostas.length === 0) return [];

    return dados.perguntas.map(pergunta => {
      const respostasPergunta = respostas
        .flatMap(r => r.itens || [])
        .filter(i => i.pergunta_id === pergunta.id);

      const contagem = {};
      const valoresNumericos = [];

      respostasPergunta.forEach(item => {
        const valor = getRespostaValor(item);
        
        if (pergunta.tipo === 'numero' || pergunta.tipo === 'escala_linear' || pergunta.tipo === 'escala_likert') {
          if (item.valor_numerico !== null && item.valor_numerico !== undefined) {
            valoresNumericos.push(Number(item.valor_numerico));
            const numVal = String(item.valor_numerico);
            contagem[numVal] = (contagem[numVal] || 0) + 1;
          }
        } else if (pergunta.tipo === 'secao') {
          // Não fazer nada para secções
        } else {
          contagem[valor] = (contagem[valor] || 0) + 1;
        }
      });

      const labels = Object.keys(contagem).sort();
      const valores = labels.map(label => contagem[label]);

      let stats = {};
      if (valoresNumericos.length > 0) {
        const sum = valoresNumericos.reduce((a, b) => a + b, 0);
        const sorted = [...valoresNumericos].sort((a, b) => a - b);
        stats = {
          min: Math.min(...valoresNumericos),
          max: Math.max(...valoresNumericos),
          avg: (sum / valoresNumericos.length).toFixed(2),
          median: sorted[Math.floor(sorted.length / 2)],
        };
      }

      return {
        pergunta,
        respostasPergunta,
        contagem,
        labels,
        valores,
        stats,
      };
    }).filter(data => data.pergunta.tipo !== 'secao');
  }, [dados, respostas, getRespostaValor]);

  // Exportar para CSV
  const exportarCSV = () => {
    const csvRows = [];
    csvRows.push(['Pergunta', 'Tipo', 'Resposta']);

    respostas.forEach(r => {
      (r.itens || []).forEach(item => {
        const pergunta = dados.perguntas.find(p => p.id === item.pergunta_id);
        if (pergunta) {
          const valorFormatado = getRespostaValor(item);
          // Escapar aspas no CSV
          const escapedEnunciado = `"${pergunta.enunciado.replace(/"/g, '""')}"`;
          const escapedValor = `"${valorFormatado.replace(/"/g, '""')}"`;
          csvRows.push([escapedEnunciado, pergunta.tipo, escapedValor]);
        }
      });
    });

    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados_${dados?.titulo_customizado || 'questionario'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-20 text-center text-2xl">A carregar resultados...</div>;
  if (erro) return <div className="p-20 text-center text-red-600 text-2xl">{erro}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-12">
          <button
            onClick={() => navigate('/qualidade/aplicacoes')}
            className="text-indigo-600 hover:text-indigo-800 font-bold text-lg flex items-center gap-2"
          >
            ← Voltar
          </button>
          <button
            onClick={exportarCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition"
          >
            Exportar CSV
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-12 mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6">
            {dados.titulo_customizado || dados.questionario_titulo}
          </h1>

          {/* Estatísticas principais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
              <p className="text-6xl font-bold text-blue-600">{numRespostas}</p>
              <p className="text-xl text-gray-700 mt-3">Respostas</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl">
              <p className="text-6xl font-bold text-green-600">{dados.total_destinatarios || 0}</p>
              <p className="text-xl text-gray-700 mt-3">Destinatários</p>
            </div>
            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl">
              <p className="text-6xl font-bold text-purple-600">{taxaResposta}%</p>
              <p className="text-xl text-gray-700 mt-3">Taxa de resposta</p>
            </div>
          </div>

          {/* Gráficos por pergunta */}
          <div className="space-y-16">
            {aggregatedPerguntasData.map(({ pergunta, respostasPergunta, contagem, labels, valores, stats }, idx) => {
              if (pergunta.tipo === 'secao') return null;

              const dadosGrafico = {
                labels,
                datasets: [{
                  label: 'Frequência',
                  data: valores,
                  backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(251, 191, 36, 0.7)',
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(244, 63, 94, 0.7)',
                  ],
                  borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(244, 63, 94, 1)',
                  ],
                  borderWidth: 1,
                }]
              };

              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  title: {
                    display: true,
                    text: `${idx + 1}. ${pergunta.enunciado}`,
                    font: { size: 18 }
                  },
                }
              };

              return (
                <div key={pergunta.id} className="bg-white rounded-3xl p-10 shadow-xl border border-gray-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                    {idx + 1}. {pergunta.enunciado}
                    {pergunta.obrigatoria && <span className="text-red-500 ml-2 text-base">(Obrigatória)</span>}
                  </h3>
                  {pergunta.descricao && (
                    <p className="text-gray-600 text-sm mb-4 text-center">{pergunta.descricao}</p>
                  )}

                  {/* Renderização condicional para diferentes tipos de pergunta */}
                  {(pergunta.tipo === 'texto_curto' || pergunta.tipo === 'texto_longo' || pergunta.tipo === 'email') ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {respostasPergunta.map((rItem, rIdx) => (
                        <p key={rIdx} className="p-3 bg-white shadow-sm rounded-md text-gray-800 break-words">
                          {getRespostaValor(rItem)}
                        </p>
                      ))}
                      {respostasPergunta.length === 0 && <p className="text-gray-500 italic">Nenhuma resposta de texto.</p>}
                    </div>
                  ) : pergunta.tipo === 'numero' || pergunta.tipo === 'escala_linear' || pergunta.tipo === 'escala_likert' ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Mínimo</p>
                          <p className="text-2xl font-bold text-blue-700">{stats.min !== undefined ? stats.min : '-'}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Máximo</p>
                          <p className="text-2xl font-bold text-blue-700">{stats.max !== undefined ? stats.max : '-'}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Média</p>
                          <p className="text-2xl font-bold text-blue-700">{stats.avg !== undefined ? stats.avg : '-'}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">Mediana</p>
                          <p className="text-2xl font-bold text-blue-700">{stats.median !== undefined ? stats.median : '-'}</p>
                        </div>
                      </div>
                      <div className="h-80">
                        <Bar data={dadosGrafico} options={chartOptions} />
                      </div>
                      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {labels.map((label, i) => (
                          <div key={i} className="bg-gray-50 rounded-xl p-4 text-center shadow">
                            <p className="text-sm text-gray-600 truncate">{label}</p>
                            <p className="text-2xl font-bold text-indigo-600">{valores[i]}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : pergunta.tipo === 'data' || pergunta.tipo === 'hora' ? (
                    <div className="h-80">
                      <Bar data={dadosGrafico} options={chartOptions} />
                    </div>
                  ) : pergunta.tipo === 'upload_ficheiro' ? (
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <p className="text-4xl font-bold text-blue-700">{respostasPergunta.length}</p>
                      <p className="text-xl text-gray-700">Ficheiros Carregados</p>
                    </div>
                  ) : (
                    <div className="h-80">
                      {pergunta.tipo.includes('escolha') || pergunta.tipo === 'lista_suspensa' ? (
                        <Doughnut data={dadosGrafico} options={chartOptions} />
                      ) : (
                        <Bar data={dadosGrafico} options={chartOptions} />
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionarioResultados;
