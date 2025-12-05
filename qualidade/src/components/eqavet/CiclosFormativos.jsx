// src/components/eqavet/CiclosFormativos.jsx
import React, { useState, useEffect } from 'react';
import { getCiclosFormativos, createCicloFormativo, updateCicloFormativo } from '../../services/api';
import AssociarTurmasModal from './AssociarTurmasModal';

const CiclosFormativos = () => {
  const [ciclos, setCiclos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    designacao: '', codigo_curso: '', area_educacao_formacao: '', nivel_qnq: 4, ano_inicio: '', ano_fim: '', observacoes: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCiclo, setSelectedCiclo] = useState(null);
  const [filterAtivo, setFilterAtivo] = useState('true'); // 'true', 'false', 'all'

  useEffect(() => {
    loadCiclos(filterAtivo);
  }, [filterAtivo]);

  const loadCiclos = async (filter) => {
    setLoading(true);
    try {
      const data = await getCiclosFormativos(filter);
      setCiclos(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCicloFormativo(editingId, form);
      } else {
        await createCicloFormativo(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ designacao: '', codigo_curso: '', area_educacao_formacao: '', nivel_qnq: 4, ano_inicio: '', ano_fim: '', observacoes: '' });
      loadCiclos(filterAtivo);
    } catch (err) { alert('Erro ao gravar ciclo'); }
  };

  const editCiclo = (ciclo) => {
    setEditingId(ciclo.id);
    setForm({ ...ciclo });
    setShowForm(true);
  };

  const toggleAtivo = async (ciclo) => {
    try {
      await updateCicloFormativo(ciclo.id, { ativo: !ciclo.ativo });
      loadCiclos(filterAtivo);
    } catch (err) {
      alert('Erro ao alterar o estado do ciclo');
    }
  };

  const openModal = (ciclo) => {
    setSelectedCiclo(ciclo);
    setIsModalOpen(true);
  };

  const handleCloseModal = (shouldReload) => {
    setIsModalOpen(false);
    setSelectedCiclo(null);
    if (shouldReload) {
      loadCiclos(filterAtivo);
    }
  };

  if (loading) return <p>Carregando ciclos formativos...</p>;

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ciclos Formativos</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterAtivo('all')}
            className={`px-3 py-1 rounded ${filterAtivo === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterAtivo('true')}
            className={`px-3 py-1 rounded ${filterAtivo === 'true' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFilterAtivo('false')}
            className={`px-3 py-1 rounded ${filterAtivo === 'false' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Inativos
          </button>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Novo Ciclo
          </button>
        </div>
      </div>

      {showForm && (
        <div className="p-6 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Editar' : 'Novo'} Ciclo Formativo</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Designação" value={form.designacao} onChange={e => setForm({ ...form, designacao: e.target.value })} required className="border rounded px-3 py-2" />
            <input placeholder="Código Curso" value={form.codigo_curso} onChange={e => setForm({ ...form, codigo_curso: e.target.value })} className="border rounded px-3 py-2" />
            <input placeholder="Área Educação Formação" value={form.area_educacao_formacao} onChange={e => setForm({ ...form, area_educacao_formacao: e.target.value })} className="border rounded px-3 py-2" />
            <select value={form.nivel_qnq} onChange={e => setForm({ ...form, nivel_qnq: Number(e.target.value) })} className="border rounded px-3 py-2">
              <option value={2}>Nível 2</option>
              <option value={4}>Nível 4</option>
              <option value={5}>Nível 5</option>
            </select>
            <input type="number" placeholder="Ano Início" value={form.ano_inicio} onChange={e => setForm({ ...form, ano_inicio: Number(e.target.value) })} required className="border rounded px-3 py-2" />
            <input type="number" placeholder="Ano Fim" value={form.ano_fim} onChange={e => setForm({ ...form, ano_fim: Number(e.target.value) })} required className="border rounded px-3 py-2" />
            <textarea placeholder="Observações" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="border rounded px-3 py-2 md:col-span-2" rows={3} />
            <div className="flex gap-3 md:col-span-2">
              <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Gravar</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-4">Designação</th>
              <th className="text-left p-4">Código</th>
              <th className="text-left p-4">AEF</th>
              <th className="text-left p-4">Nível</th>
              <th className="text-left p-4">Período</th>
              <th className="text-left p-4">Turmas</th>
              <th className="text-left p-4">Ativo</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ciclos.length === 0 && (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  Nenhum ciclo formativo encontrado.
                </td>
              </tr>
            )}
            {ciclos.map(c => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="p-4">{c.designacao}</td>
                <td className="p-4">{c.codigo_curso}</td>
                <td className="p-4">{c.area_educacao_formacao}</td>
                <td className="p-4">Nível {c.nivel_qnq}</td>
                <td className="p-4">{c.ano_inicio}/{c.ano_fim}</td>
                <td className="p-4 text-center">{c.total_turmas || 0}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${c.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4 text-center space-x-2">
                  <button onClick={() => editCiclo(c)} className="text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => toggleAtivo(c)} className="text-gray-600 hover:underline">
                    {c.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => openModal(c)} className="text-purple-600 hover:underline">Gerir Turmas</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && selectedCiclo && (
        <AssociarTurmasModal ciclo={selectedCiclo} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default CiclosFormativos;
