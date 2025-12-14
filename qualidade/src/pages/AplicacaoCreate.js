// src/pages/AplicacaoCreate.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getQuestionariosTemplates,
  createAplicacaoQuestionario,
  getClasses,
  getDisciplinaTurma,
  getProfessorDisciplinaTurma,
} from '../services/api';
import useAuth from '../hooks/useAuth';

const AplicacaoCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [disciplinaTurmas, setDisciplinaTurmas] = useState([]);

  const [form, setForm] = useState({
    questionario_id: '',
    titulo_customizado: '',
    tipo_aplicacao: 'turma',
    publico_alvo: 'alunos',
    turma_id: '',
    disciplina_turma_id: '',
    ano_escolar: '',
    data_abertura: new Date().toISOString().slice(0, 16),
    data_fecho: '',
    notificar_destinatarios: true,
    lembrar_nao_respondidos: true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        let dt = [];
        // Se o user for PROFESSOR, busca apenas as suas turmas/disciplinas
        if (user && user.tipo_utilizador === 'PROFESSOR') {
          dt = await getProfessorDisciplinaTurma(user.id);
        } else {
          // Se for ADMIN ou outro tipo, busca tudo
          dt = await getDisciplinaTurma();
        }

        const [tmpl, cls] = await Promise.all([
          getQuestionariosTemplates(),
          getClasses(),
        ]);
        
        setTemplates(tmpl);
        setTurmas(cls);
        setDisciplinaTurmas(dt);

      } catch (err) {
        alert('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (!form.questionario_id) return alert('Seleciona um questionário');

    if (['turma', 'encarregados_turma'].includes(form.tipo_aplicacao) && !form.turma_id) {
      return alert('Seleciona uma turma');
    }

    if (form.tipo_aplicacao === 'disciplina_turma' && !form.disciplina_turma_id) {
      return alert('Seleciona uma disciplina');
    }

    if (form.tipo_aplicacao === 'encarregados_ano' && !form.ano_escolar) {
      return alert('Indica o ano escolar');
    }

    try {
      const payload = {
        questionario_id: form.questionario_id,
        aplicador_id: user.id,
        titulo_customizado: form.titulo_customizado || null,
        tipo_aplicacao: form.tipo_aplicacao,
        publico_alvo: form.publico_alvo,
        turma_id: form.turma_id || null,
        disciplina_turma_id: form.disciplina_turma_id || null,
        // ANO_ESCOLAR COMO NÚMERO (corrigido!)
        ano_escolar: form.ano_escolar ? parseInt(form.ano_escolar, 10) : null,
        // DATA DE ABERTURA SEMPRE NO FORMATO ISO CORRETO
        data_abertura: form.data_abertura ? new Date(form.data_abertura).toISOString() : new Date().toISOString(),
        data_fecho: form.data_fecho ? new Date(form.data_fecho).toISOString() : null,
        notificar_destinatarios: form.notificar_destinatarios,
        lembrar_nao_respondidos: form.lembrar_nao_respondidos,
      };

      console.log('Payload enviado:', payload); // ← para debug

      const novaAplicacao = await createAplicacaoQuestionario(payload);

      // LINK ABERTO
      if (form.tipo_aplicacao === 'link_aberto') {
        const token = novaAplicacao.token_acesso;
        const link = `${window.location.origin}/qualidade/public/responder/${token}`;

        if (navigator.clipboard) {
          await navigator.clipboard.writeText(link);
        }

        alert(
          `Aplicação criada!\n\n` +
          `Link público (copiado):\n${link}\n\n` +
          `Partilha com quem quiseres!`
        );
      } else {
        alert('Aplicação criada com sucesso!');
      }

      navigate('/qualidade/aplicacoes');
    } catch (err) {
      console.error('Erro completo:', err);
      alert(
        err.response?.data?.message ||
        err.message ||
        'Erro ao criar aplicação. Verifica o console.'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-12">
        <h1 className="text-4xl font-bold mb-10">Nova Aplicação de Questionário</h1>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Questionário */}
          <div>
            <label className="block text-xl font-bold mb-4">Questionário *</label>
            <select
              name="questionario_id"
              value={form.questionario_id}
              onChange={handleChange}
              required
              className="w-full px-6 py-4 border rounded-xl text-lg"
            >
              <option value="">-- Escolher --</option>
              {templates.map(q => (
                <option key={q.id} value={q.id}>{q.titulo}</option>
              ))}
            </select>
          </div>

          {/* Título personalizado */}
          <div>
            <label className="block text-xl font-bold mb-4">Título personalizado</label>
            <input
              type="text"
              name="titulo_customizado"
              value={form.titulo_customizado}
              onChange={handleChange}
              className="w-full px-6 py-4 border rounded-xl text-lg"
            />
          </div>

          {/* Tipo + Público */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-xl font-bold mb-4">Como aplicar? *</label>
              <select name="tipo_aplicacao" value={form.tipo_aplicacao} onChange={handleChange} className="w-full px-6 py-4 border rounded-xl text-lg">
                <option value="turma">Turma inteira</option>
                <option value="disciplina_turma">Disciplina específica</option>
                <option value="todos_professores">Todos os professores</option>
                <option value="encarregados_turma">Encarregados de turma</option>
                <option value="encarregados_ano">Encarregados por ano</option>
                <option value="empresas_parceiras">Empresas parceiras</option>
                <option value="link_aberto">Link aberto</option>
              </select>
            </div>
            <div>
              <label className="block text-xl font-bold mb-4">Quem responde? *</label>
              <select name="publico_alvo" value={form.publico_alvo} onChange={handleChange} className="w-full px-6 py-4 border rounded-xl text-lg">
                <option value="alunos">Alunos</option>
                <option value="professores">Professores</option>
                <option value="encarregados">Encarregados</option>
                <option value="empresas">Empresas</option>
                <option value="externos">Externos</option>
              </select>
            </div>
          </div>

          {/* Campos condicionais */}
          {['turma', 'encarregados_turma'].includes(form.tipo_aplicacao) && (
            <div>
              <label className="block text-xl font-bold mb-4">Turma *</label>
              <select name="turma_id" value={form.turma_id} onChange={handleChange} required className="w-full px-6 py-4 border rounded-xl text-lg">
                <option value="">-- Selecionar --</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>
          )}

          {form.tipo_aplicacao === 'disciplina_turma' && (
            <div>
              <label className="block text-xl font-bold mb-4">Disciplina/Turma *</label>
              <select name="disciplina_turma_id" value={form.disciplina_turma_id} onChange={handleChange} required className="w-full px-6 py-4 border rounded-xl text-lg">
                <option value="">-- Selecionar --</option>
                {disciplinaTurmas.map(dt => (
                  <option key={dt.id} value={dt.id}>
                    {dt.disciplina_nome} - {dt.turma_nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.tipo_aplicacao === 'encarregados_ano' && (
            <div>
              <label className="block text-xl font-bold mb-4">Ano escolar *</label>
              <select name="ano_escolar" value={form.ano_escolar} onChange={handleChange} required className="w-full px-6 py-4 border rounded-xl text-lg">
                <option value="">-- Selecionar --</option>
                {[7,8,9,10,11,12].map(a => (
                  <option key={a} value={a}>{a}º ano</option>
                ))}
              </select>
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-xl font-bold mb-4">Abertura *</label>
              <input type="datetime-local" name="data_abertura" value={form.data_abertura} onChange={handleChange} required className="w-full px-6 py-4 border rounded-xl text-lg" />
            </div>
            <div>
              <label className="block text-xl font-bold mb-4">Fecho</label>
              <input type="datetime-local" name="data_fecho" value={form.data_fecho} onChange={handleChange} className="w-full px-6 py-4 border rounded-xl text-lg" />
            </div>
          </div>

          {/* Notificações */}
          <div className="space-y-6">
            <label className="flex items-center gap-4 text-xl">
              <input type="checkbox" name="notificar_destinatarios" checked={form.notificar_destinatarios} onChange={handleChange} className="w-6 h-6" />
              Notificar por email
            </label>
            <label className="flex items-center gap-4 text-xl">
              <input type="checkbox" name="lembrar_nao_respondidos" checked={form.lembrar_nao_respondidos} onChange={handleChange} className="w-6 h-6" />
              Enviar lembretes
            </label>
          </div>

          <div className="text-center pt-12">
            <button
              type="submit"
              className="bg-green-600 text-white px-32 py-6 rounded-2xl text-2xl font-bold hover:bg-green-700 transition"
            >
              Criar Aplicação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AplicacaoCreate;
