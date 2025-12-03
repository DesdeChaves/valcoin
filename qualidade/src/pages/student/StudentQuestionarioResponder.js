// src/pages/student/StudentQuestionarioResponder.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestionarioByAplicacaoId, submeterRespostaAutenticada } from '../../services/api';

const StudentQuestionarioResponder = () => {
  const { aplicacaoId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dados, setDados] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // Timestamps para medir tempo de resposta
  const [dataInicio] = useState(new Date());
  const [temposPorPergunta, setTemposPorPergunta] = useState({});

  useEffect(() => {
    const carregar = async () => {
      try {
        const resultado = await getQuestionarioByAplicacaoId(aplicacaoId);
        setDados(resultado);
        
        // Inicializar timestamps para cada pergunta
        const temposIniciais = {};
        resultado.perguntas.forEach(p => {
          temposIniciais[p.id] = new Date();
        });
        setTemposPorPergunta(temposIniciais);
        
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Este questionário não está disponível ou já foi respondido.');
        setLoading(false);
      }
    };
    carregar();
  }, [aplicacaoId]);

  const handleResposta = (perguntaId, valor, tipo) => {
    setRespostas(prev => ({
      ...prev,
      [perguntaId]: {
        valor,
        tipo,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const calcularTempoResposta = (perguntaId) => {
    if (!temposPorPergunta[perguntaId]) return 0;
    const agora = new Date();
    return Math.floor((agora - temposPorPergunta[perguntaId]) / 1000);
  };

  const validarRespostasObrigatorias = () => {
    const perguntasObrigatorias = dados.perguntas.filter(p => p.obrigatoria && p.tipo !== 'secao');
    const faltantes = perguntasObrigatorias.filter(p => !respostas[p.id]);
    
    if (faltantes.length > 0) {
      const nomes = faltantes.map(p => `"${p.enunciado}"`).join(', ');
      alert(`Por favor, responde às seguintes perguntas obrigatórias: ${nomes}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarRespostasObrigatorias()) {
      return;
    }

    setSubmitting(true);

    try {
      const dataSubmissao = new Date();
      const tempoTotalSegundos = Math.floor((dataSubmissao - dataInicio) / 1000);

      const itensResposta = Object.keys(respostas).map(perguntaId => {
        const pergunta = dados.perguntas.find(p => p.id === perguntaId);
        const respostaData = respostas[perguntaId];
        const tempoResposta = calcularTempoResposta(perguntaId);

        const item = {
          pergunta_id: perguntaId,
          tempo_resposta_segundos: tempoResposta,
        };

        switch (pergunta.tipo) {
          case 'texto_curto':
          case 'texto_longo':
          case 'email':
            item.texto = respostaData.valor;
            break;

          case 'escolha_unica':
          case 'lista_suspensa':
            item.opcoes_selecionadas = [respostaData.valor];
            break;

          case 'escolha_multipla':
            item.opcoes_selecionadas = respostaData.valor;
            break;

          case 'numero':
          case 'escala_linear':
            item.valor_numerico = parseFloat(respostaData.valor);
            break;

          case 'data':
            item.valor_data = respostaData.valor;
            break;

          case 'hora':
            item.valor_hora = respostaData.valor;
            break;

          case 'escala_likert':
            item.valor_numerico = parseInt(respostaData.valor);
            item.texto = respostaData.valor; // guardar também o label se necessário
            break;

          case 'upload_ficheiro':
            item.ficheiros_url = respostaData.valor; // array de URLs
            break;

          default:
            item.texto = JSON.stringify(respostaData.valor);
        }

        return item;
      });

      const payload = {
        resposta_questionario: {
          anonimo: dados.permite_anonimo || false,
          tempo_decorrido_segundos: tempoTotalSegundos,
          completado: true,
        },
        itens_resposta: itensResposta,
      };

      await submeterRespostaAutenticada(aplicacaoId, payload);

      if (dados.mensagem_conclusao) {
        navigate('/qualidade/obrigado', { 
          state: { 
            mensagem: dados.mensagem_conclusao,
            mostrarResultados: dados.mostrar_resultados_apos_submissao 
          } 
        });
      } else {
        navigate('/qualidade/obrigado');
      }

    } catch (err) {
      console.error('Erro ao enviar:', err);
      alert('Erro ao enviar a resposta. Por favor, tenta novamente.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-xl text-gray-700">A carregar o questionário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header do questionário */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {dados.titulo_customizado || dados.titulo}
          </h1>
          
          {dados.descricao && (
            <p className="text-gray-600 mb-4">{dados.descricao}</p>
          )}
          
          {dados.mensagem_introducao && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-4">
              <p className="text-gray-800 text-lg">{dados.mensagem_introducao}</p>
            </div>
          )}
          
          <div className="text-sm text-gray-500 mt-4">
            <span className="text-red-500">*</span> Campos obrigatórios
          </div>
          
          {dados.permite_anonimo && (
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700">
                ℹ️ Este questionário é anónimo. As tuas respostas não serão associadas à tua identidade.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {dados.perguntas && dados.perguntas.map((pergunta, index) => {
            // Se for uma secção, renderizar diferente
            if (pergunta.tipo === 'secao') {
              return (
                <div key={pergunta.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border-l-4 border-blue-500">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{pergunta.enunciado}</h2>
                  {pergunta.descricao && (
                    <p className="text-gray-700">{pergunta.descricao}</p>
                  )}
                </div>
              );
            }

            return (
              <div key={pergunta.id} className="bg-white rounded-xl shadow-md p-8">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-gray-400 font-medium text-lg">{index + 1}.</span>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      {pergunta.enunciado}
                      {pergunta.obrigatoria && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    
                    {pergunta.descricao && (
                      <p className="text-gray-600 text-sm mb-4">{pergunta.descricao}</p>
                    )}
                  </div>
                </div>

                {/* Texto curto */}
                {pergunta.tipo === 'texto_curto' && (
                  <input
                    type="text"
                    required={pergunta.obrigatoria}
                    maxLength={pergunta.config?.max_length || 255}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'texto_curto')}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={pergunta.config?.placeholder || "Escreve a tua resposta aqui..."}
                  />
                )}

                {/* Texto longo */}
                {pergunta.tipo === 'texto_longo' && (
                  <textarea
                    required={pergunta.obrigatoria}
                    maxLength={pergunta.config?.max_length || 5000}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'texto_longo')}
                    rows={pergunta.config?.rows || 6}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                    placeholder={pergunta.config?.placeholder || "Escreve a tua resposta aqui..."}
                  />
                )}

                {/* Escolha única */}
                {pergunta.tipo === 'escolha_unica' && (
                  <div className="space-y-3">
                    {pergunta.opcoes.map(opcao => (
                      <label key={opcao.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition border-2 border-transparent hover:border-blue-200">
                        <input
                          type="radio"
                          name={`pergunta_${pergunta.id}`}
                          value={opcao.id}
                          required={pergunta.obrigatoria}
                          onChange={(e) => handleResposta(pergunta.id, e.target.value, 'escolha_unica')}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="text-lg">{opcao.texto}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Escolha múltipla */}
                {pergunta.tipo === 'escolha_multipla' && (
                  <div className="space-y-3">
                    {pergunta.opcoes.map(opcao => (
                      <label key={opcao.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition border-2 border-transparent hover:border-blue-200">
                        <input
                          type="checkbox"
                          value={opcao.id}
                          onChange={(e) => {
                            const selecionadas = respostas[pergunta.id]?.valor || [];
                            if (e.target.checked) {
                              handleResposta(pergunta.id, [...selecionadas, opcao.id], 'escolha_multipla');
                            } else {
                              handleResposta(pergunta.id, selecionadas.filter(id => id !== opcao.id), 'escolha_multipla');
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                        <span className="text-lg">{opcao.texto}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Lista suspensa */}
                {pergunta.tipo === 'lista_suspensa' && (
                  <select
                    required={pergunta.obrigatoria}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'lista_suspensa')}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    defaultValue=""
                  >
                    <option value="" disabled>Seleciona uma opção...</option>
                    {pergunta.opcoes.map(opcao => (
                      <option key={opcao.id} value={opcao.id}>
                        {opcao.texto}
                      </option>
                    ))}
                  </select>
                )}

                {/* Escala linear */}
                {pergunta.tipo === 'escala_linear' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-sm text-gray-600 font-medium">
                        {pergunta.config?.label_min || pergunta.config?.min || '1'}
                      </span>
                      <span className="text-sm text-gray-600 font-medium">
                        {pergunta.config?.label_max || pergunta.config?.max || '10'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={pergunta.config?.min || 1}
                      max={pergunta.config?.max || 10}
                      step={pergunta.config?.step || 1}
                      required={pergunta.obrigatoria}
                      defaultValue={pergunta.config?.min || 1}
                      onChange={(e) => handleResposta(pergunta.id, e.target.value, 'escala_linear')}
                      className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="text-center">
                      <span className="inline-block bg-blue-600 text-white text-2xl font-bold px-6 py-3 rounded-lg">
                        {respostas[pergunta.id]?.valor || pergunta.config?.min || 1}
                      </span>
                    </div>
                  </div>
                )}

                {/* Escala Likert */}
                {pergunta.tipo === 'escala_likert' && (
                  <div className="space-y-3">
                    {['Discordo Totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo Totalmente'].map((label, idx) => (
                      <label key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition border-2 border-transparent hover:border-blue-200">
                        <input
                          type="radio"
                          name={`pergunta_${pergunta.id}`}
                          value={idx + 1}
                          required={pergunta.obrigatoria}
                          onChange={(e) => handleResposta(pergunta.id, e.target.value, 'escala_likert')}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="text-lg">{label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Número */}
                {pergunta.tipo === 'numero' && (
                  <input
                    type="number"
                    required={pergunta.obrigatoria}
                    min={pergunta.config?.min}
                    max={pergunta.config?.max}
                    step={pergunta.config?.step || 1}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'numero')}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Introduz um número..."
                  />
                )}

                {/* Email */}
                {pergunta.tipo === 'email' && (
                  <input
                    type="email"
                    required={pergunta.obrigatoria}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'email')}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="exemplo@email.com"
                  />
                )}

                {/* Data */}
                {pergunta.tipo === 'data' && (
                  <input
                    type="date"
                    required={pergunta.obrigatoria}
                    min={pergunta.config?.min_date}
                    max={pergunta.config?.max_date}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'data')}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}

                {/* Hora */}
                {pergunta.tipo === 'hora' && (
                  <input
                    type="time"
                    required={pergunta.obrigatoria}
                    onChange={(e) => handleResposta(pergunta.id, e.target.value, 'hora')}
                    className="w-full px-5 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}

                {/* Upload de ficheiro - simplificado por agora */}
                {pergunta.tipo === 'upload_ficheiro' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      multiple={pergunta.config?.max_files > 1}
                      accept={pergunta.config?.allowed_types?.join(',')}
                      required={pergunta.obrigatoria}
                      onChange={(e) => {
                        // Aqui precisarias de fazer upload e guardar URLs
                        // Por agora, apenas guardamos os nomes dos ficheiros
                        const files = Array.from(e.target.files).map(f => f.name);
                        handleResposta(pergunta.id, files, 'upload_ficheiro');
                      }}
                      className="hidden"
                      id={`file_${pergunta.id}`}
                    />
                    <label htmlFor={`file_${pergunta.id}`} className="cursor-pointer">
                      <div className="text-gray-600 mb-2">
                        📁 Clica para selecionar ficheiros
                      </div>
                      <div className="text-sm text-gray-500">
                        {pergunta.config?.max_files > 1 
                          ? `Máximo ${pergunta.config.max_files} ficheiros`
                          : '1 ficheiro'
                        }
                      </div>
                    </label>
                  </div>
                )}

              </div>
            );
          })}

          <div className="text-center mt-12 pb-8">
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-xl px-12 py-5 rounded-xl shadow-lg transition transform hover:scale-105 disabled:transform-none"
            >
              {submitting ? 'A enviar...' : '✓ Enviar Respostas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentQuestionarioResponder;
