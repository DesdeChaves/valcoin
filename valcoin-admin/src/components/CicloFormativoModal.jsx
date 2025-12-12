import React, { useState, useEffect } from 'react';

const CicloFormativoModal = ({ showModal, closeModal, modalType, selectedItem, onSave, onDelete, professors }) => {
  const [form, setForm] = useState({
    designacao: '',
    codigo_curso: '',
    area_educacao_formacao: '',
    nivel_qnq: 4,
    ano_inicio: '',
    ano_fim: '',
    observacoes: '',
    ativo: true,
    responsavel_id: ''
  });

  useEffect(() => {
    if (showModal && modalType === 'editCicloFormativo' && selectedItem) {
      setForm({
        designacao: selectedItem.designacao || '',
        codigo_curso: selectedItem.codigo_curso || '',
        area_educacao_formacao: selectedItem.area_educacao_formacao || '',
        nivel_qnq: selectedItem.nivel_qnq || 4,
        ano_inicio: selectedItem.ano_inicio || '',
        ano_fim: selectedItem.ano_fim || '',
        observacoes: selectedItem.observacoes || '',
        ativo: selectedItem.ativo !== undefined ? selectedItem.ativo : true,
        responsavel_id: selectedItem.responsavel_id || ''
      });
    } else {
      setForm({
        designacao: '',
        codigo_curso: '',
        area_educacao_formacao: '',
        nivel_qnq: 4,
        ano_inicio: '',
        ano_fim: '',
        observacoes: '',
        ativo: true,
        responsavel_id: ''
      });
    }
  }, [showModal, modalType, selectedItem]);

  if (!showModal) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...selectedItem, ...form });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-4">{modalType === 'createCicloFormativo' ? 'Novo Ciclo Formativo' : 'Editar Ciclo Formativo'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <div className="md:col-span-2">
              <label htmlFor="responsavel_id" className="block text-sm font-medium text-gray-700">Professor Responsável</label>
              <select
                id="responsavel_id"
                value={form.responsavel_id}
                onChange={e => setForm({ ...form, responsavel_id: e.target.value })}
                className="mt-1 block w-full border rounded px-3 py-2"
              >
                <option value="">-- Selecione um Professor --</option>
                {professors.map(prof => (
                  <option key={prof.id} value={prof.id}>{prof.nome}</option>
                ))}
              </select>
            </div>

            <textarea placeholder="Observações" value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="border rounded px-3 py-2 md:col-span-2" rows={3} />

            <div className="md:col-span-2 flex items-center">
                <input
                    type="checkbox"
                    id="ativo-modal"
                    checked={form.ativo}
                    onChange={e => setForm({ ...form, ativo: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="ativo-modal" className="ml-2 text-sm font-medium text-gray-700">Ativo</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={closeModal} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">Cancelar</button>
            {modalType === 'editCicloFormativo' && <button type="button" onClick={() => onDelete(selectedItem)} className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700">Apagar</button>}
            <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">Gravar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CicloFormativoModal;
