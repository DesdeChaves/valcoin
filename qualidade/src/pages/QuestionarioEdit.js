// src/pages/QuestionarioEdit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAplicacaoById, updateAplicacao } from '../services/api';

const QuestionarioEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    titulo_customizado: '',
    data_fecho: '',
    notificar_destinatarios: true,
    lembrar_nao_respondidos: false,
  });

  // Carregar dados da aplicação
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAplicacaoById(id);
        setForm({
          titulo_customizado: data.titulo_customizado || '',
          data_fecho: data.data_fecho ? data.data_fecho.slice(0, 16) : '',
          notificar_destinatarios: data.notificar_destinatarios !== false,
          lembrar_nao_respondidos: data.lembrar_nao_respondidos || false,
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar a aplicação.');
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateAplicacao(id, {
        titulo_customizado: form.titulo_customizado || null,
        data_fecho: form.data_fecho ? new Date(form.data_fecho).toISOString() : null,
        notificar_destinatarios: form.notificar_destinatarios,
        lembrar_nao_respondidos: form.lembrar_nao_respondidos,
      });

      alert('Aplicação atualizada com sucesso!');
      navigate('/qualidade');
    } catch (err) {
      console.error(err);
      setError('Erro ao guardar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
        <p className="mt-4 text-gray-600">A carregar aplicação...</p>
      </div>
    );
  }

  if (error && loading === false) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Editar Aplicação de Questionário</h1>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Título personalizado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título personalizado (opcional)
            </label>
            <input
              type="text"
              name="titulo_customizado"
              value={form.titulo_customizado}
              onChange={handleChange}
              placeholder="Deixa vazio para usar o título original"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <p className="text-xs text-gray-500 mt-2">
              Se vazio, será usado o título do questionário original.
            </p>
          </div>

          {/* Data de fecho */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data e hora de fecho (opcional)
            </label>
            <input
              type="datetime-local"
              name="data_fecho"
              value={form.data_fecho}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <p className="text-xs text-gray-500 mt-2">
              Se vazio, o questionário não tem data de fecho.
            </p>
          </div>

          {/* Notificações */}
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="notificar_destinatarios"
                checked={form.notificar_destinatarios}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">
                Enviar notificação por email aos destinatários
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="lembrar_nao_respondidos"
                checked={form.lembrar_nao_respondidos}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">
                Enviar lembretes automáticos a quem ainda não respondeu
              </span>
            </label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/qualidade')}
              className="px-8 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  A guardar...
                </>
              ) : (
                'Guardar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionarioEdit;
