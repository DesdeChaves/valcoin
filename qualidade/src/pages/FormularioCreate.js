// src/pages/FormularioCreate.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionBuilder from '../components/QuestionBuilder';
import {
  getQuestionariosTemplates,
  createQuestionario,        // NOVA FUNÇÃO
  createPergunta,            // NOVA FUNÇÃO
  createAplicacaoQuestionario,
  getClasses,
  getDisciplinaTurma,
  createOpcaoResposta
} from '../services/api';
import useAuth from '../hooks/useAuth';

const FormularioCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState('scratch'); // 'scratch' ou 'template'
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
    visibilidade: 'privado', // privado por defeito para professores
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
    setPerguntas(prev => [...prev, {
      tempId: Date.now(),
      enunciado: '',
      tipo_pergunta: 'escolha_unica',
      obrigatoria: true,
      ordem: prev.length + 1,
      pagina: 1,
      opcoes: []
    }]);
  };

  const updatePergunta = (index, novaPergunta) => {
    setPerguntas(prev => prev.map((p, i) => i === index ? novaPergunta : p));
  };

  const deletePergunta = (index) => {
    setPerguntas(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, ordem: i + 1 })));
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
      // 1. Criar questionário + perguntas num único pedido
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

    // 2. Criar aplicação com data_abertura OBRIGATÓRIA
    const aplicacaoPayload = {
      questionario_id: questionarioId,
      aplicador_id: user.id,
      titulo_customizado: mode === 'scratch' ? details.titulo : null,
      tipo_aplicacao: details.tipo_aplicacao,
      publico_alvo: details.publico_alvo,
      turma_id: details.turma_id || null,
      disciplina_turma_id: details.disciplina_turma_id || null,
      // DATA DE ABERTURA OBRIGATÓRIA → usa agora se vazio
      data_abertura: details.data_abertura 
        ? new Date(details.data_abertura).toISOString() 
        : new Date().toISOString(), // ← NUNCA NULL
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
      <h1 className="text-3xl font-bold mb-6">Criar Questionário</h1>
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

        {/* Dados gerais */}
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

        {/* Configurações da aplicação (comuns) */}
        <div className="bg-blue-50 p-5 rounded-lg">
          <h3 className="font-bold mb-4">Distribuição (quem responde?)</h3>
          {/* ... aqui os campos de turma, tipo_aplicacao, datas, etc. (iguais ao anterior) */}
          {/* Copia a parte de "Público-Alvo", "Tipo de Aplicação", "Turma", "Datas", etc. do exemplo anterior */}
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
