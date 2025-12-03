// src/pages/AplicacaoEdit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAplicacaoById, updateAplicacao } from '../services/api';

const AplicacaoEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dados, setDados] = useState(null);

  const [form, setForm] = useState({
    titulo_customizado: '',
    data_fecho: '',
    notificar_destinatarios: true,
    lembrar_nao_respondidos: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAplicacaoById(id);
        setDados(res);
        setForm({
          titulo_customizado: res.titulo_customizado || '',
          data_fecho: res.data_fecho ? res.data_fecho.slice(0, 16) : '',
          notificar_destinatarios: res.notificar_destinatarios,
          lembrar_nao_respondidos: res.lembrar_nao_respondidos,
        });
        setLoading(false);
      } catch (err) {
        alert('Erro ao carregar aplicação');
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAplicacao(id, {
        titulo_customizado: form.titulo_customizado || null,
        data_fecho: form.data_fecho ? new Date(form.data_fecho).toISOString() : null,
        notificar_destinatarios: form.notificar_destinatarios,
        lembrar_nao_respondidos: form.lembrar_nao_respondidos,
      });
      alert('Aplicação atualizada!');
      navigate('/qualidade/aplicacoes');
    } catch (err) {
      alert('Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-2xl">A carregar...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-12">
        <h1 className="text-4xl font-bold mb-10">Editar Aplicação</h1>

        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 rounded-2xl mb-10">
          <h2 className="text-3xl font-bold">{dados?.titulo_customizado || dados?.questionario_titulo}</h2>
          <p className="text-xl mt-3 opacity-90">
            {dados?.tipo_aplicacao} • {dados?.publico_alvo}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div>
            <label className="block text-xl font-medium mb-4">Título personalizado</label>
            <input
              type="text"
              value={form.titulo_customizado}
              onChange={(e) => setForm({ ...form, titulo_customizado: e.target.value })}
              className="w-full px-6 py-5 border-2 rounded-xl text-xl"
              placeholder="Deixa vazio para usar o título original"
            />
          </div>

          <div>
            <label className="block text-xl font-medium mb-4">Data de fecho</label>
            <input
              type="datetime-local"
              value={form.data_fecho}
              onChange={(e) => setForm({ ...form, data_fecho: e.target.value })}
              className="w-full px-6 py-5 border-2 rounded-xl text-xl"
            />
          </div>

          <div className="space-y-6">
            <label className="flex items-center gap-5 text-xl cursor-pointer">
              <input
                type="checkbox"
                checked={form.notificar_destinatarios}
                onChange={(e) => setForm({ ...form, notificar_destinatarios: e.target.checked })}
                className="w-8 h-8"
              />
              <span>Notificar destinatários por email</span>
            </label>

            <label className="flex items-center gap-5 text-xl cursor-pointer">
              <input
                type="checkbox"
                checked={form.lembrar_nao_respondidos}
                onChange={(e) => setForm({ ...form, lembrar_nao_respondidos: e.target.checked })}
                className="w-8 h-8"
              />
              <span>Enviar lembretes automáticos</span>
            </label>
          </div>

          <div className="flex justify-end gap-6 pt-10">
            <button
              type="button"
              onClick={() => navigate('/qualidade/aplicacoes')}
              className="px-12 py-5 bg-gray-500 text-white rounded-xl text-xl hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-16 py-5 bg-green-600 text-white rounded-xl text-xl font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'A guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AplicacaoEdit;
