// src/pages/QuestionarioEditor.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import QuestionBuilder from '../components/QuestionBuilder';
import {
  getQuestionarioById,
  createQuestionario,
  updateQuestionario,
  deleteQuestionario,
  getQuestionariosTemplates
} from '../services/api';

const QuestionarioEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: 'avaliacao',
    visibilidade: 'privado',
  });

  const [perguntas, setPerguntas] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [tmpl] = await Promise.all([
          getQuestionariosTemplates()
        ]);
        setTemplates(tmpl);

        if (id) {
          const data = await getQuestionarioById(id);
          setForm({
            titulo: data.titulo,
            descricao: data.descricao || '',
            categoria: data.categoria || 'avaliacao',
            visibilidade: data.visibilidade || 'privado',
          });
          setPerguntas(data.perguntas || []);
        }
      } catch (err) {
        setError('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const adicionarPergunta = () => {
    const novaPergunta = {
      tempId: Date.now(),
      enunciado: '',
      tipo: 'texto_curto',
      obrigatoria: true,
      ordem: perguntas.length + 1,
      pagina: 1,
      opcoes: []
    };
    
    // Adiciona no início do array (visual)
    setPerguntas(prev => [novaPergunta, ...prev]);
  };

  const atualizarPergunta = (index, novaPergunta) => {
    setPerguntas(prev => prev.map((p, i) => i === index ? novaPergunta : p));
  };

  const removerPergunta = (index) => {
    setPerguntas(prev => prev.filter((_, i) => i !== index));
  };

  const duplicarPergunta = (index) => {
    const p = perguntas[index];
    const copia = {
      ...p,
      tempId: Date.now(),
      enunciado: p.enunciado + ' (cópia)',
      ordem: perguntas.length + 1
    };
    // Adiciona duplicata no início
    setPerguntas(prev => [copia, ...prev]);
  };

  const handlePrintPDF = async () => {
    if (!form.titulo.trim()) {
      alert('Por favor, defina um título para o questionário antes de gerar o PDF.');
      return;
    }

    if (perguntas.length === 0) {
      alert('Adicione pelo menos uma pergunta antes de gerar o PDF.');
      return;
    }

    // Ordenar perguntas pela ordem original (inverso da visualização)
    const perguntasOrdenadas = [...perguntas].reverse();

    const tiposLabel = {
      'texto_curto': 'Texto Curto',
      'texto_longo': 'Parágrafo',
      'escolha_unica': 'Escolha Única',
      'escolha_multipla': 'Múltipla Escolha',
      'lista_suspensa': 'Lista Suspensa',
      'escala_linear': 'Escala Linear (1-10)',
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
          <title>${form.titulo}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; line-height: 1.6; }
            h1 { color: #333; text-align: center; margin-bottom: 10px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
            .description { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4F46E5; margin-bottom: 30px; }
            .question { margin-bottom: 30px; page-break-inside: avoid; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
            .question-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
            .question-number { font-weight: bold; color: #4F46E5; font-size: 16px; }
            .question-type { font-size: 12px; color: #666; background-color: #f0f0f0; padding: 4px 8px; border-radius: 4px; }
            .question-text { font-size: 15px; font-weight: 600; margin: 10px 0; color: #333; }
            .question-help { font-size: 13px; color: #666; font-style: italic; margin-bottom: 15px; }
            .required { color: #e53e3e; font-weight: bold; }
            .options { margin-left: 20px; }
            .option { padding: 8px 0; font-size: 14px; }
            .option::before { content: "○ "; color: #4F46E5; font-weight: bold; margin-right: 8px; }
            .scale-info { background-color: #fffbeb; padding: 10px; border-radius: 4px; font-size: 13px; margin-top: 10px; }
            .footer { font-size: 10px; text-align: center; margin-top: 40px; color: #777; border-top: 1px solid #ddd; padding-top: 10px; }
            .metadata { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 4px; }
            .answer-space { border: 1px solid #ccc; width: 100%; min-height: 40px; margin-top: 10px; border-radius: 4px; background-color: #fafafa; }
            .answer-space-large { min-height: 100px; }
          </style>
        </head>
        <body>
          <div class="header" style="text-align: center; margin-bottom: 20px;">
            <img src="http://nginx/qualidade/logotipo.jpg" alt="Logotipo" style="max-width: 718px; height: auto;">
          </div>
          
          <h1>${form.titulo}</h1>
          <div class="subtitle">Categoria: ${form.categoria} | Visibilidade: ${form.visibilidade}</div>
          
          ${form.descricao ? `<div class="description"><strong>Descrição:</strong> ${form.descricao}</div>` : ''}
          
          <div class="metadata">
            <span><strong>Total de perguntas:</strong> ${perguntas.length}</span>
            <span><strong>Data de criação:</strong> ${new Date().toLocaleDateString()}</span>
          </div>

          ${perguntasOrdenadas.map((p, index) => `
            <div class="question">
              <div class="question-header">
                <span class="question-number">Pergunta ${index + 1}</span>
                <span class="question-type">${tiposLabel[p.tipo] || 'Desconhecido'}</span>
              </div>
              
              <div class="question-text">
                ${p.enunciado || 'Sem enunciado'}
                ${p.obrigatoria ? '<span class="required">*</span>' : ''}
              </div>
              
              ${p.descricao ? `<div class="question-help">${p.descricao}</div>` : ''}
              
              ${(p.opcoes && p.opcoes.length > 0) ? `
                <div class="options">
                  ${p.opcoes.map(op => `<div class="option">${op.texto}</div>`).join('')}
                </div>
              ` : ''}
              
              ${p.tipo === 'escala_linear' ? `
                <div class="scale-info">
                  <strong>Escala de 1 a 10</strong><br>
                  ${p.config?.label_min ? `1: ${p.config.label_min}` : '1: Mínimo'} | 
                  ${p.config?.label_max ? `10: ${p.config.label_max}` : '10: Máximo'}
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
                  ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span style="padding: 5px 10px; border: 1px solid #ccc; border-radius: 3px;">${n}</span>`).join('')}
                </div>
              ` : ''}
              
              ${p.tipo === 'texto_curto' ? `
                <div class="answer-space"></div>
              ` : ''}
              
              ${p.tipo === 'texto_longo' ? `
                <div class="answer-space answer-space-large"></div>
              ` : ''}
              
              ${p.tipo === 'data' ? `
                <div style="display: inline-block; padding: 8px 15px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px;">
                  ___/___/______
                </div>
              ` : ''}
              
              ${p.tipo === 'hora' ? `
                <div style="display: inline-block; padding: 8px 15px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px;">
                  ___:___
                </div>
              ` : ''}
              
              ${p.tipo === 'numero' ? `
                <div style="display: inline-block; padding: 8px 15px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px; min-width: 150px;">
                  Número: _____________
                </div>
              ` : ''}
              
              ${p.tipo === 'email' ? `
                <div style="display: inline-block; padding: 8px 15px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px; min-width: 250px;">
                  Email: _____________@_____________
                </div>
              ` : ''}
            </div>
          `).join('')}

          <div class="footer">
            Sistema de Questionários 2025 • Documento gerado em ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}
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
      a.download = `Questionario_${form.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Não foi possível gerar o PDF. Verifique a consola para mais detalhes.');
    }
  };

  const handleSalvar = async () => {
    if (!form.titulo.trim()) return setError('O título é obrigatório');
    if (perguntas.length === 0) return setError('Adicione pelo menos uma pergunta');

    setSaving(true);
    setError('');

    try {
      // Ordenar perguntas pela ordem correta (inverso) antes de salvar
      const perguntasOrdenadas = [...perguntas].reverse();
      
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        visibilidade: form.visibilidade,
        perguntas: perguntasOrdenadas.map((p, i) => ({
          id: p.id || undefined,
          enunciado: p.enunciado,
          tipo: p.tipo,
          obrigatoria: p.obrigatoria,
          ordem: i + 1,
          pagina: 1,
          descricao: p.descricao || null,
          config: p.config || null,
          opcoes: (p.opcoes || []).map((op, j) => ({
            id: op.id || undefined,
            texto: op.texto || '',
            ordem: j + 1,
            e_correta: op.e_correta || false
          }))
        }))
      };

      if (id) {
        await updateQuestionario(id, payload);
        alert('Questionário atualizado com sucesso!');
      } else {
        await createQuestionario(payload);
        alert('Questionário criado com sucesso!');
        navigate('/questionarios');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleApagar = async () => {
    if (!window.confirm('Tens a certeza que queres apagar este questionário?')) return;
    try {
      await deleteQuestionario(id);
      alert('Questionário apagado');
      navigate('/questionarios');
    } catch (err) {
      setError('Erro ao apagar');
    }
  };

  const handleDuplicarComoNovo = () => {
    navigate('/questionarios/criar', { state: { duplicarDe: id } });
  };

  if (loading) return <div className="p-10 text-center">A carregar...</div>;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">
          {id ? 'Editar Questionário' : 'Criar Questionário'}
        </h1>
        <div className="flex gap-3">
          {perguntas.length > 0 && (
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-5 h-5" />
              Gerar PDF
            </button>
          )}
          {id && (
            <>
              <button
                onClick={handleDuplicarComoNovo}
                className="bg-purple-600 text-white px-5 py-3 rounded-lg hover:bg-purple-700"
              >
                Duplicar
              </button>
              <button
                onClick={handleApagar}
                className="bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700"
              >
                Apagar
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl p-10 space-y-10">
        {/* Informações gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-lg font-medium mb-3">Título do Questionário *</label>
            <input
              type="text"
              name="titulo"
              value={form.titulo}
              onChange={handleChange}
              className="w-full px-5 py-4 border rounded-xl text-lg"
              placeholder="Ex: Avaliação de Desempenho Docente"
              required
            />
          </div>
          <div>
            <label className="block text-lg font-medium mb-3">Categoria</label>
            <select
              name="categoria"
              value={form.categoria}
              onChange={handleChange}
              className="w-full px-5 py-4 border rounded-xl text-lg"
            >
              <option value="avaliacao">Avaliação</option>
              <option value="quiz">Quiz / Teste</option>
              <option value="satisfacao">Satisfação</option>
              <option value="diagnostico">Diagnóstico</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-lg font-medium mb-3">Descrição (opcional)</label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            rows="4"
            className="w-full px-5 py-4 border rounded-xl text-lg"
            placeholder="Descreve o objetivo deste questionário..."
          />
        </div>

        <div>
          <label className="block text-lg font-medium mb-3">Visibilidade</label>
          <select
            name="visibilidade"
            value={form.visibilidade}
            onChange={handleChange}
            className="w-full px-5 py-4 border rounded-xl text-lg"
          >
            <option value="privado">Apenas eu</option>
            <option value="escola">Todos os professores da escola</option>
            <option value="publico">Biblioteca pública (todos)</option>
          </select>
        </div>

        {/* Perguntas */}
        <div className="border-t-4 border-gray-200 pt-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Perguntas</h2>
            <button
              type="button"
              onClick={adicionarPergunta}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-blue-700 flex items-center gap-3"
            >
              + Adicionar Pergunta
            </button>
          </div>

          {perguntas.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <p className="text-xl text-gray-600">Nenhuma pergunta adicionada ainda</p>
              <p className="text-sm text-gray-500 mt-2">As perguntas aparecem aqui de cima para baixo conforme as adiciona</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> As novas perguntas aparecem no topo para facilitar a edição. 
                  A ordem final no questionário será invertida (primeira adicionada = primeira no formulário).
                </p>
              </div>
              <div className="space-y-8">
                {perguntas.map((p, index) => (
                  <QuestionBuilder
                    key={p.tempId || p.id}
                    pergunta={{ ...p, ordem: perguntas.length - index }}
                    onUpdate={(nova) => atualizarPergunta(index, nova)}
                    onDelete={() => removerPergunta(index)}
                    onDuplicate={() => duplicarPergunta(index)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Botões */}
        <div className="flex justify-between items-center pt-10 border-t-4 border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/questionarios')}
            className="text-lg px-8 py-4 border-2 border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            className="text-lg px-12 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'A guardar...' : (id ? 'Guardar Alterações' : 'Criar Questionário')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionarioEditor;
