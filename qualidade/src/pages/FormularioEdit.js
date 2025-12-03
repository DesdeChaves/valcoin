// src/pages/FormularioEdit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAplicacaoById, updateAplicacao } from '../services/api';
import useAuth from '../hooks/useAuth';

const FormularioEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    titulo_customizado: '',
    data_fecho: '',
    notificar_destinatarios: true,
    lembrar_nao_respondidos: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAplicacaoById(id);
        setForm({
          titulo_customizado: data.titulo_customizado || '',
          data_fecho: data.data_fecho ? data.data_fecho.slice(0, 16) : '',
          notificar_destinatarios: data.notificar_destinatarios,
          lembrar_nao_respondidos: data.lembrar_nao_respondidos,
        });
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar aplicação');
        setLoading(false);
      }
    };
    load();
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
      setError('Erro ao atualizar');
    }
  };

  if (loading) return <div className="p-8 text-center">A carregar...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Editar Aplicação</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">
        <div>
          <label className="block font-medium mb-1">Título personalizado</label>
          <input
            type="text"
            name="titulo_customizado"
            value={form.titulo_customizado}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Data de fecho</label>
          <input
            type="datetime-local"
            name="data_fecho"
            value={form.data_fecho}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center">
            <input type="checkbox" name="notificar_destinatarios" checked={form.notificar_destinatarios} onChange={handleChange} className="mr-2" />
            Notificar destinatários
          </label>
          <label className="flex items-center">
            <input type="checkbox" name="lembrar_nao_respondidos" checked={form.lembrar_nao_respondidos} onChange={handleChange} className="mr-2" />
            Enviar lembretes
          </label>
        </div>
        <div className="flex gap-4">
          <button type="submit" className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700">
            Guardar Alterações
          </button>
          <button type="button" onClick={() => navigate('/qualidade')} className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioEdit;
