// src/pages/FormularioCreate.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import QuestionBuilder from '../components/QuestionBuilder';
import {
  getQuestionariosTemplates,
  createQuestionario,
  createPergunta,
  createAplicacaoQuestionario,
  getClasses,
  getDisciplinaTurma,
  createOpcaoResposta
} from '../services/api';
import useAuth from '../hooks/useAuth';

const FormularioCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState('scratch');
  const [templates, setTemplates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [disciplinaTurmas, setDisciplinaTurmas] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [perguntas, setPerguntas] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [details, setDetails] = useState({
    titulo: '',
    descricao: '',
    categoria: 'avaliacao',
    visibilidade: 'privado',
    turma_id: '',
    disciplina_turma_id: '',
    tipo_aplicacao: 'turma',
    publico_alvo: 'alunos',
    data_abertura: '',
    data_fecho: '',
    permite_anonimo: false,
    permite_multiplas_respostas: true,
    notificar_destinatarios: true,
    lembrar_nao_respondidos: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [tmpl, cls, dt] = await Promise.all([
          getQuestionariosTemplates(),
          getClasses(),
          getDisciplinaTurma()
        ]);
        setTemplates(tmpl);
        setClasses(cls);
        setDisciplinaTurmas(dt);
      } catch (err) {
        setError('Erro ao carregar dados.');
      }
    };
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDetails(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addPergunta = () => {
    const novaPergunta = {
      tempId: Date.now(),
      enunciado: '',
      tipo_pergunta: 'escolha_unica',
      obrigatoria: true,
      ordem: 1,
      pagina: 1,
      opcoes: []
    };
    
    // Adiciona no início e reordena as existentes
    setPerguntas(prev => [
      novaPergunta,
      ...prev.map((p, i) => ({ ...p, ordem: i + 2 }))
    ]);
  };

  const updatePergunta = (index, novaPergunta) => {
    setPerguntas(prev => prev.map((p, i) => i === index ? novaPergunta : p));
  };

  const deletePergunta = (index) => {
    setPerguntas(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 })));
  };

  const handlePrintPDF = async () => {
    if (!details.titulo.trim()) {
      alert('Por favor, defina um título para o questionário antes de gerar o PDF.');
      return;
    }

    if (perguntas.length === 0) {
      alert('Adicione pelo menos uma pergunta antes de gerar o PDF.');
      return;
    }

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
          <title>${details.titulo}</title>
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
          </style>
        </head>
        <body>
          <div class="header" style="text-align: center; margin-bottom: 20px;">
            <img src="http://nginx/qualidade/logotipo.jpg" alt="Logotipo" style="max-width: 718px; height: auto;">
          </div>
          
          <h1>${details.titulo}</h1>
          <div class="subtitle">Categoria: ${details.categoria} | Público-Alvo: ${details.publico_alvo}</div>
          
          ${details.descricao ? `<div class="description"><strong>Descrição:</strong> ${details.descricao}</div>` : ''}
          
          <div class="metadata">
            <span><strong>Total de perguntas:</strong> ${perguntas.length}</span>
            <span><strong>Data de criação:</strong> ${new Date().toLocaleDateString()}</span>
          </div>

          ${perguntas.map((p, index) => `
            <div class="question">
              <div class="question-header">
                <span class="question-number">Pergunta ${index + 1}</span>
                <span class="question-type">${tiposLabel[p.tipo_pergunta || p.tipo] || 'Desconhecido'}</span>
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
              
              ${(p.tipo_pergunta === 'escala_linear' || p.tipo === 'escala_linear') ? `
                <div class="scale-info">
                  <strong>Escala de 1 a 10</strong><br>
                  ${p.config?.label_min ? `1: ${p.config.label_min}` : '1: Mínimo'} | 
                  ${p.config?.label_max ? `10: ${p.config.label_max}` : '10: Máximo'}
                </div>
              ` : ''}
              
              ${(p.tipo_pergunta === 'texto_curto' || p.tipo === 'texto_curto') ? `
                <div style="border-bottom: 1px solid #ccc; width: 100%; height: 30px; margin-top: 10px;"></div>
              ` : ''}
              
              ${(p.tipo_pergunta === 'texto_longo' || p.tipo === 'texto_longo') ? `
                <div style="border: 1px solid #ccc; width: 100%; height: 100px; margin-top: 10px; border-radius: 4px;"></div>
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
      a.download = `Questionario_${details.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Não foi possível gerar o PDF. Verifique a consola para mais detalhes.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!details.titulo.trim()) return setError('O título é obrigatório.');
    if (mode === 'scratch' && perguntas.length === 0) return setError('Adicione pelo menos uma pergunta.');

    setSubmitting(true);
    setError(null);

    try {
      let questionarioId;

      if (mode === 'template') {
        questionarioId = selectedTemplate;
        if (!questionarioId) throw new Error('Selecione um template.');
      } else {
        const payload = {
          titulo: details.titulo,
          descricao: details.descricao || '',
          categoria: details.categoria,
          visibilidade: details.visibilidade,
          perguntas: perguntas.map((p, i) => ({
            enunciado: p.enunciado,
            tipo: p.tipo_pergunta || p.tipo,
            obrigatoria: p.obrigatoria,
            ordem: i + 1,
            pagina: 1,
            descricao: p.descricao || null,
            opcoes: (p.opcoes || []).map((op, j) => ({
              texto: op.texto || '',
              ordem: j + 1,
              e_correta: op.e_correta || false
            }))
          }))
        };

        const novoQuestionario = await createQuestionario(payload);
        questionarioId = novoQuestionario.id;
      }

      const aplicacaoPayload = {
        questionario_id: questionarioId,
        aplicador_id: user.id,
        titulo_customizado: mode === 'scratch' ? details.titulo : null,
        tipo_aplicacao: details.tipo_aplicacao,
        publico_alvo: details.publico_alvo,
        turma_id: details.turma_id || null,
        disciplina_turma_id: details.disciplina_turma_id || null,
        data_abertura: details.data_abertura 
          ? new Date(details.data_abertura).toISOString() 
          : new Date().toISOString(),
        data_fecho: details.data_fecho 
          ? new Date(details.data_fecho).toISOString() 
          : null,
        notificar_destinatarios: details.notificar_destinatarios,
        lembrar_nao_respondidos: details.lembrar_nao_respondidos,
      };

      await createAplicacaoQuestionario(aplicacaoPayload);

      alert('Questionário criado e aplicado com sucesso!');
      navigate('/qualidade');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Erro ao criar questionário.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Criar Questionário</h1>
        {mode === 'scratch' && perguntas.length > 0 && (
          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Printer className="w-5 h-5" />
            Gerar PDF
          </button>
        )}
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      <div className="bg-gray-50 p-5 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Modo de Criação</h2>
        <div className="flex gap-6">
          <label className="flex items-center">
            <input type="radio" name="mode" checked={mode === 'scratch'} onChange={() => setMode('scratch')} className="mr-2" />
            Criar Novo Questionário
          </label>
          <label className="flex items-center">
            <input type="radio" name="mode" checked={mode === 'template'} onChange={() => setMode('template')} className="mr-2" />
            Usar Template Existente
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Título do Questionário *</label>
            <input type="text" name="titulo" value={details.titulo} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Categoria</label>
            <select name="categoria" value={details.categoria} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="avaliacao">Avaliação</option>
              <option value="quiz">Quiz/Teste</option>
              <option value="satisfacao">Satisfação</option>
              <option value="diagnostico">Diagnóstico</option>
            </select>
          </div>
        </div>

        {mode === 'scratch' && (
          <>
            <div>
              <label className="block font-semibold mb-1">Descrição (opcional)</label>
              <textarea name="descricao" value={details.descricao} onChange={handleChange} rows="3" className="w-full border rounded px-3 py-2"></textarea>
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Perguntas</h2>
                <button type="button" onClick={addPergunta} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  + Adicionar Pergunta
                </button>
              </div>

              {perguntas.length === 0 && <p className="text-gray-500">Ainda não adicionou nenhuma pergunta.</p>}

              {perguntas.map((p, index) => (
                <QuestionBuilder
                  key={p.tempId || p.id}
                  pergunta={p}
                  onUpdate={(nova) => updatePergunta(index, nova)}
                  onDelete={() => deletePergunta(index)}
                />
              ))}
            </div>
          </>
        )}

        {mode === 'template' && (
          <div>
            <label className="block font-semibold mb-1">Escolher Template</label>
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} required className="w-full border rounded px-3 py-2">
              <option value="">-- Selecionar template --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.titulo} ({t.categoria})</option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-blue-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4">Distribuição (quem responde?)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Público-Alvo</label>
              <select name="publico_alvo" value={details.publico_alvo} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="alunos">Alunos</option>
                <option value="professores">Professores</option>
                <option value="encarregados">Encarregados de Educação</option>
                <option value="funcionarios">Funcionários</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Tipo de Aplicação</label>
              <select name="tipo_aplicacao" value={details.tipo_aplicacao} onChange={handleChange} className="w-full border rounded px-3 py-2">
                <option value="turma">Por Turma</option>
                <option value="disciplina">Por Disciplina/Turma</option>
                <option value="geral">Geral (toda a escola)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6">
          <button type="button" onClick={() => navigate('/qualidade')} className="px-6 py-3 bg-gray-500 text-white rounded hover:bg-gray-600">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {submitting ? 'A criar...' : 'Criar e Aplicar Questionário'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioCreate;
