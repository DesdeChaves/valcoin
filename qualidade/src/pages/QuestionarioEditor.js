// src/pages/QuestionarioEditor.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QuestionBuilder from '../components/QuestionBuilder';
import {
  getQuestionarioById,
  createQuestionario,
  updateQuestionario,
  deleteQuestionario,
  getQuestionariosTemplates
} from '../services/api';

const QuestionarioEditor = () => {
  const { id } = useParams(); // se vier id → editar, senão → criar novo
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

  // Carregar templates e, se for edição, carregar o questionário
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
    setPerguntas(prev => [...prev, {
      tempId: Date.now(),
      enunciado: '',
      tipo: 'texto_curto',
      obrigatoria: true,
      ordem: prev.length + 1,
      pagina: 1,
      opcoes: []
    }]);
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
    setPerguntas(prev => [...prev, copia]);
  };

  const handleSalvar = async () => {
    if (!form.titulo.trim()) return setError('O título é obrigatório');
    if (perguntas.length === 0) return setError('Adicione pelo menos uma pergunta');

    setSaving(true);
    setError('');

    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        categoria: form.categoria,
        visibilidade: form.visibilidade,
        perguntas: perguntas.map((p, i) => ({
          id: p.id || undefined,
          enunciado: p.enunciado,
          tipo: p.tipo,
          obrigatoria: p.obrigatoria,
          ordem: i + 1,
          pagina: 1,
          descricao: p.descricao || null,
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
            </div>
          ) : (
            <div className="space-y-8">
              {perguntas.map((p, index) => (
                <QuestionBuilder
                  key={p.tempId || p.id}
                  pergunta={p}
                  onUpdate={(nova) => atualizarPergunta(index, nova)}
                  onDelete={() => removerPergunta(index)}
                  onDuplicate={() => duplicarPergunta(index)}
                />
              ))}
            </div>
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
