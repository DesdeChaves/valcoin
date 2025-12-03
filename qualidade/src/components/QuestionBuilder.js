// src/components/QuestionBuilder.jsx
import React, { useState } from 'react';

const QuestionBuilder = ({ pergunta, onUpdate, onDelete, onDuplicate }) => {
  const [data, setData] = useState({
    enunciado: pergunta.enunciado || '',
    tipo: pergunta.tipo || 'texto_curto',
    descricao: pergunta.descricao || '',
    obrigatoria: pergunta.obrigatoria !== false,
    config: pergunta.config || {},
    opcoes: pergunta.opcoes || [],
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const novoValor = type === 'checkbox' ? checked : value;
    const atualizado = { ...data, [name]: novoValor };
    setData(atualizado);
    onUpdate(atualizado);
  };

  const adicionarOpcao = () => {
    const novaOpcao = { tempId: Date.now(), texto: '', ordem: data.opcoes.length + 1 };
    const novasOpcoes = [...data.opcoes, novaOpcao];
    setData({ ...data, opcoes: novasOpcoes });
    onUpdate({ ...data, opcoes: novasOpcoes });
  };

  const atualizarOpcao = (index, novoTexto) => {
    const novasOpcoes = data.opcoes.map((op, i) =>
      i === index ? { ...op, texto: novoTexto } : op
    );
    setData({ ...data, opcoes: novasOpcoes });
    onUpdate({ ...data, opcoes: novasOpcoes });
  };

  const removerOpcao = (index) => {
    const novasOpcoes = data.opcoes.filter((_, i) => i !== index);
    setData({ ...data, opcoes: novasOpcoes });
    onUpdate({ ...data, opcoes: novasOpcoes });
  };

  const precisaOpcoes = ['escolha_unica', 'escolha_multipla', 'lista_suspensa'].includes(data.tipo);

  const tipos = [
    { value: 'texto_curto', label: 'Texto Curto' },
    { value: 'texto_longo', label: 'Parágrafo' },
    { value: 'escolha_unica', label: 'Escolha Única (radio)' },
    { value: 'escolha_multipla', label: 'Múltipla Escolha (checkbox)' },
    { value: 'lista_suspensa', label: 'Lista Suspensa' },
    { value: 'escala_linear', label: 'Escala Linear (1 a 10)' },
    { value: 'escala_likert', label: 'Escala Likert' },
    { value: 'data', label: 'Data' },
    { value: 'hora', label: 'Hora' },
    { value: 'email', label: 'Email' },
    { value: 'numero', label: 'Número' },
    { value: 'upload_ficheiro', label: 'Upload de Ficheiro' },
    { value: 'secao', label: 'Seção (título/separador)' },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-8 mb-8 shadow-lg">
      {/* Cabeçalho da pergunta */}
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-2xl font-bold text-gray-800">
          Pergunta {pergunta.ordem || '?'}
        </h3>
        <div className="flex gap-3">
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              title="Duplicar pergunta"
            >
              Duplicar
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 font-medium text-sm"
            title="Apagar pergunta"
          >
            Apagar
          </button>
        </div>
      </div>

      {/* Tipo + Obrigatória */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de pergunta</label>
          <select
            name="tipo"
            value={data.tipo}
            onChange={handleChange}
            className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          >
            {tipos.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="obrigatoria"
              checked={data.obrigatoria}
              onChange={handleChange}
              className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-lg font-medium text-gray-700">Pergunta obrigatória</span>
          </label>
        </div>
      </div>

      {/* Enunciado */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enunciado da pergunta *
        </label>
        <input
          type="text"
          name="enunciado"
          value={data.enunciado}
          onChange={handleChange}
          placeholder="Ex: Como avalia o desempenho do professor?"
          className="w-full px-5 py-4 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* Descrição/Help */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Texto de ajuda (opcional)
        </label>
        <textarea
          name="descricao"
          value={data.descricao}
          onChange={handleChange}
          rows="3"
          placeholder="Ex: Selecione a opção que melhor representa a sua opinião..."
          className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Opções (se necessário) */}
      {precisaOpcoes && (
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-semibold">Opções de resposta</h4>
            <button
              type="button"
              onClick={adicionarOpcao}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
            >
              + Adicionar Opção
            </button>
          </div>

          {data.opcoes.length === 0 ? (
            <p className="text-gray-500 italic">Nenhuma opção adicionada</p>
          ) : (
            <div className="space-y-4">
              {data.opcoes.map((op, index) => (
                <div key={op.tempId || op.id || index} className="flex gap-3 items-center">
                  <span className="text-gray-600 font-medium w-12">{index + 1}.</span>
                  <input
                    type="text"
                    value={op.texto || ''}
                    onChange={(e) => atualizarOpcao(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1 px-5 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removerOpcao(index)}
                    className="text-red-600 hover:text-red-800 text-2xl"
                    title="Remover opção"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configurações especiais (ex: escala) */}
      {data.tipo === 'escala_linear' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 p-6 mt-6">
          <h4 className="font-semibold mb-4">Configuração da Escala (1 a 10)</h4>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Etiqueta do 1</label>
              <input
                type="text"
                placeholder="Ex: Muito insatisfeito"
                value={data.config?.label_min || ''}
                onChange={(e) => {
                  const config = { ...data.config, label_min: e.target.value };
                  setData({ ...data, config });
                  onUpdate({ ...data, config });
                }}
                className="w-full border rounded px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Etiqueta do 10</label>
              <input
                type="text"
                placeholder="Ex: Muito satisfeito"
                value={data.config?.label_max || ''}
                onChange={(e) => {
                  const config = { ...data.config, label_max: e.target.value };
                  setData({ ...data, config });
                  onUpdate({ ...data, config });
                }}
                className="w-full border rounded px-4 py-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBuilder;
