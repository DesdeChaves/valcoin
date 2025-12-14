// src/pages/QuestionarioResultados.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
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

  const getRespostaValor = useCallback((item) => {
    if (item.resposta_texto !== null && item.resposta_texto !== undefined && item.resposta_texto !== '') {
      return item.resposta_texto;
    }
    
    if (item.texto !== null && item.texto !== undefined && item.texto !== '') {
      return item.texto;
    }
    
    if (item.opcoes_selecionadas && item.opcoes_selecionadas.length > 0) {
      if (item.opcoes_texto && item.opcoes_texto.length > 0) {
        return item.opcoes_texto.join(', ');
      }
      return `${item.opcoes_selecionadas.length} opção(ões) selecionada(s)`;
    }
    
    if (item.valor_numerico !== null && item.valor_numerico !== undefined) {
      return String(item.valor_numerico);
    }
    
    if (item.valor_data) {
      return item.valor_data;
    }
    
    if (item.valor_hora) {
      return item.valor_hora;
    }
    
    if (item.ficheiros_url && item.ficheiros_url.length > 0) {
      return `Ficheiros (${item.ficheiros_url.length})`;
    }
    
    return 'Sem resposta';
  }, []);

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

  const exportarCSV = () => {
    const csvRows = [];
    csvRows.push(['Pergunta', 'Tipo', 'Resposta']);

    respostas.forEach(r => {
      (r.itens || []).forEach(item => {
        const pergunta = dados.perguntas.find(p => p.id === item.pergunta_id);
        if (pergunta) {
          const valorFormatado = getRespostaValor(item);
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

  const exportarPDF = async () => {
    if (!dados || !aggregatedPerguntasData || aggregatedPerguntasData.length === 0) {
      alert('Não há dados suficientes para gerar o relatório PDF.');
      return;
    }

    const tiposLabel = {
      'texto_curto': 'Texto Curto',
      'texto_longo': 'Parágrafo',
      'escolha_unica': 'Escolha Única',
      'escolha_multipla': 'Múltipla Escolha',
      'lista_suspensa': 'Lista Suspensa',
      'escala_linear': 'Escala Linear',
      'escala_likert': 'Escala Likert',
      'data': 'Data',
      'hora': 'Hora',
      'email': 'Email',
      'numero': 'Número',
      'upload_ficheiro': 'Upload de Ficheiro',
      'secao': 'Seção'
    };

    const htmlContent = `
      <html>
        <head>
          <title>Resultados - ${dados.titulo_customizado || dados.questionario_titulo}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; line-height: 1.6; }
            h1 { color: #4F46E5; text-align: center; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-card { background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-center; }
            .stat-value { font-size: 36px; font-weight: bold; color: #4F46E5; }
            .stat-label { font-size: 14px; color: #666; margin-top: 8px; }
            .question { margin-bottom: 40px; page-break-inside: avoid; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #fafafa; }
            .question-header { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
            .question-type { font-size: 12px; color: #666; background-color: #e0e0e0; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 10px; }
            .stats-numeric { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .stat-box { background-color: #EEF2FF; padding: 15px; border-radius: 8px; text-center; }
            .stat-box-label { font-size: 12px; color: #666; }
            .stat-box-value { font-size: 24px; font-weight: bold; color: #4F46E5; margin-top: 5px; }
            .frequency-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .frequency-table th, .frequency-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            .frequency-table th { background-color: #4F46E5; color: white; font-weight: 600; }
            .frequency-table tr:nth-child(even) { background-color: #f9f9f9; }
            .text-responses { max-height: 400px; background-color: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-top: 10px; }
            .text-response { padding: 10px; margin-bottom: 8px; background-color: #f5f5f5; border-left: 3px solid #4F46E5; border-radius: 4px; }
            .footer { font-size: 10px; text-align: center; margin-top: 40px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header" style="text-align: center; margin-bottom: 20px;">
            <img src="http://nginx/qualidade/logotipo.jpg" alt="Logotipo" style="max-width: 718px; height: auto;">
          </div>
          
          <h1>Resultados do Questionário</h1>
          <div class="subtitle">${dados.titulo_customizado || dados.questionario_titulo}</div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${numRespostas}</div>
              <div class="stat-label">Respostas Recebidas</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${dados.total_destinatarios || 0}</div>
              <div class="stat-label">Total de Destinatários</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${taxaResposta}%</div>
              <div class="stat-label">Taxa de Resposta</div>
            </div>
          </div>

          ${aggregatedPerguntasData.map(({ pergunta, respostasPergunta, contagem, labels, valores, stats }, idx) => `
            <div class="question">
              <div class="question-header">
                ${idx + 1}. ${pergunta.enunciado}
                ${pergunta.obrigatoria ? '<span style="color: #e53e3e; font-size: 14px;"> (Obrigatória)</span>' : ''}
              </div>
              <div class="question-type">${tiposLabel[pergunta.tipo] || pergunta.tipo}</div>
              ${pergunta.descricao ? `<p style="color: #666; font-size: 13px; margin: 10px 0;">${pergunta.descricao}</p>` : ''}
              
              <p style="margin: 15px 0; font-weight: 600;">Total de respostas: ${respostasPergunta.length}</p>
              
              ${(pergunta.tipo === 'texto_curto' || pergunta.tipo === 'texto_longo' || pergunta.tipo === 'email') ? `
                <div class="text-responses">
                  <strong>Respostas de Texto:</strong>
                  ${respostasPergunta.slice(0, 20).map(item => `
                    <div class="text-response">${getRespostaValor(item)}</div>
                  `).join('')}
                  ${respostasPergunta.length > 20 ? `<p style="color: #666; font-style: italic; margin-top: 10px;">... e mais ${respostasPergunta.length - 20} respostas</p>` : ''}
                </div>
              ` : (pergunta.tipo === 'numero' || pergunta.tipo === 'escala_linear' || pergunta.tipo === 'escala_likert') ? `
                <div class="stats-numeric">
                  <div class="stat-box">
                    <div class="stat-box-label">Mínimo</div>
                    <div class="stat-box-value">${stats.min !== undefined ? stats.min : '-'}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-box-label">Máximo</div>
                    <div class="stat-box-value">${stats.max !== undefined ? stats.max : '-'}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-box-label">Média</div>
                    <div class="stat-box-value">${stats.avg !== undefined ? stats.avg : '-'}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-box-label">Mediana</div>
                    <div class="stat-box-value">${stats.median !== undefined ? stats.median : '-'}</div>
                  </div>
                </div>
                <table class="frequency-table">
                  <thead>
                    <tr>
                      <th>Valor</th>
                      <th>Frequência</th>
                      <th>Percentagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${labels.map((label, i) => `
                      <tr>
                        <td>${label}</td>
                        <td>${valores[i]}</td>
                        <td>${((valores[i] / respostasPergunta.length) * 100).toFixed(1)}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : pergunta.tipo === 'upload_ficheiro' ? `
                <div style="text-align: center; padding: 30px; background-color: #EEF2FF; border-radius: 8px;">
                  <div style="font-size: 48px; font-weight: bold; color: #4F46E5;">${respostasPergunta.length}</div>
                  <div style="font-size: 18px; color: #666; margin-top: 10px;">Ficheiros Carregados</div>
                </div>
              ` : `
                <table class="frequency-table">
                  <thead>
                    <tr>
                      <th>Opção</th>
                      <th>Frequência</th>
                      <th>Percentagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${labels.map((label, i) => `
                      <tr>
                        <td>${label}</td>
                        <td>${valores[i]}</td>
                        <td>${((valores[i] / respostasPergunta.length) * 100).toFixed(1)}%</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              `}
            </div>
          `).join('')}

          <div class="footer">
            Sistema de Questionários 2025 • Relatório gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}<br>
            Total de ${numRespostas} respostas analisadas
          </div>
        </body>
      </html>
    `;

    try {
      const formData = new FormData();
      const htmlFile = new Blob([htmlContent], { type: 'text/html' });
      formData.append('files', htmlFile, 'index.html');

      const response = await fetch('/gotenberg/forms/chromium/convert/html', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `Resultados_${(dados?.titulo_customizado || dados?.questionario_titulo || 'questionario').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Não foi possível gerar o PDF. Verifique a consola para mais detalhes.');
    }
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
          <div className="flex gap-4">
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition"
            >
              <Printer className="w-5 h-5" />
              Exportar PDF
            </button>
            <button
              onClick={exportarCSV}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition"
            >
              Exportar CSV
            </button>
          </div>
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
