// src/components/TransactionRuleModal.jsx
import React, { useState, useEffect } from 'react';

const TransactionRuleModal = ({ rule, onClose, onSave, settings }) => {
  const [formData, setFormData] = useState({
    nome: '',
    montante: '',
    tipo_transacao: 'CREDITO',
    origem_permitida: 'ALUNO',
    destino_permitido: 'ALUNO',
    limite_valor: '',
    limite_periodo: 'nenhum',
    limite_por_disciplina: false,
    categoria: 'Moeda', // New field with default value
    taxa_iva_ref: 'isento',
    icon: '',
    ano_min: '',
    ano_max: '',
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        nome: rule.nome || '',
        montante: rule.montante?.toString() || '',
        tipo_transacao: rule.tipo_transacao || 'CREDITO',
        origem_permitida: rule.origem_permitida || 'ALUNO',
        destino_permitido: rule.destino_permitido || 'ALUNO',
        limite_valor: rule.limite_valor?.toString() || '',
        limite_periodo: rule.limite_periodo || 'nenhum',
        limite_por_disciplina: rule.limite_por_disciplina || false,
        categoria: rule.categoria || 'Moeda', // New field
        taxa_iva_ref: rule.taxa_iva_ref || 'isento',
        icon: rule.icon || '',
        ano_min: rule.ano_min?.toString() || '',
        ano_max: rule.ano_max?.toString() || '',
      });
    }
  }, [rule]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      id: rule ? rule.id : undefined,
      montante: parseFloat(formData.montante) || 0,
      limite_valor: parseFloat(formData.limite_valor) || 0,
    };
    if (!payload.nome || payload.montante < 0 || !payload.categoria) {
      alert('Por favor, preencha o nome, um montante válido e selecione uma categoria.');
      return;
    }
    onSave(payload);
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.error('onClose is not a function');
    }
  };

  const categories = [
    'Moeda',
    'Sala de Aula',
    'Comunidades',
    'Cidadania e Valores',
    'Colaboração e Liderança',
    'Inovação e Criatividade',
    'Compromisso Global',
    'Materiais',
    'Legado',
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg mx-4 my-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{rule ? 'Editar Regra' : 'Adicionar Regra'}</h2>
        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="mb-4">
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="montante" className="block text-sm font-medium text-gray-700 mb-1">Montante</label>
              <input
                type="number"
                id="montante"
                name="montante"
                value={formData.montante}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="tipo_transacao" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Transação</label>
              <select
                id="tipo_transacao"
                name="tipo_transacao"
                value={formData.tipo_transacao}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="CREDITO">Crédito</option>
                <option value="DEBITO">Débito</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="origem_permitida" className="block text-sm font-medium text-gray-700 mb-1">Origem Permitida</label>
              <select
                id="origem_permitida"
                name="origem_permitida"
                value={formData.origem_permitida}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALUNO">Aluno</option>
                <option value="PROFESSOR">Professor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="destino_permitido" className="block text-sm font-medium text-gray-700 mb-1">Destino Permitido</label>
              <select
                id="destino_permitido"
                name="destino_permitido"
                value={formData.destino_permitido}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALUNO">Aluno</option>
                <option value="PROFESSOR">Professor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="limite_valor" className="block text-sm font-medium text-gray-700 mb-1">Limite de Valor</label>
              <input
                type="number"
                id="limite_valor"
                name="limite_valor"
                value={formData.limite_valor}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="limite_periodo" className="block text-sm font-medium text-gray-700 mb-1">Limite de Período</label>
              <select
                id="limite_periodo"
                name="limite_periodo"
                value={formData.limite_periodo}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="nenhum">Nenhum</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                id="categoria"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="mb-4 flex items-center">
              <label htmlFor="limite_por_disciplina" className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  id="limite_por_disciplina"
                  name="limite_por_disciplina"
                  checked={formData.limite_por_disciplina}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Limite por Disciplina
              </label>
            </div>
            <div className="mb-4">
              <label htmlFor="taxa_iva_ref" className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA</label>
              <select
                id="taxa_iva_ref"
                name="taxa_iva_ref"
                value={formData.taxa_iva_ref}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.keys(settings.taxasIVA).map((key) => (
                  <option key={key} value={key}>{key} ({settings.taxasIVA[key]}%)</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="ano_min" className="block text-sm font-medium text-gray-700 mb-1">Ano Mínimo</label>
              <input
                type="number"
                id="ano_min"
                name="ano_min"
                value={formData.ano_min}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="ano_max" className="block text-sm font-medium text-gray-700 mb-1">Ano Máximo</label>
              <input
                type="number"
                id="ano_max"
                name="ano_max"
                value={formData.ano_max}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-1">Ícone (SVG)</label>
            <textarea
              id="icon"
              name="icon"
              value={formData.icon}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
              placeholder='<svg>...</svg>'
            />
          </div>
          <div className="flex justify-end space-x-4 mt-6 sticky bottom-0 bg-white py-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
            >
              {rule ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionRuleModal;
