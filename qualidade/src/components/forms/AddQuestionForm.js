import React, { useState } from 'react';

const questionTypes = [
  { value: 'texto_curto', label: 'Texto Curto' },
  { value: 'texto_longo', label: 'Texto Longo' },
  { value: 'escolha_multipla', label: 'Escolha Múltipla' },
  { value: 'caixas_selecao', label: 'Caixas de Seleção' },
  { value: 'lista_suspensa', label: 'Lista Suspensa' },
  { value: 'escala_linear', label: 'Escala Linear' },
  { value: 'data', label: 'Data' },
  { value: 'hora', label: 'Hora' },
];

const AddQuestionForm = ({ onAddQuestion, onCancel, existingQuestionsCount }) => {
  const [enunciado, setEnunciado] = useState('');
  const [tipoPergunta, setTipoPergunta] = useState('texto_curto');
  const [obrigatoria, setObrigatoria] = useState(false);

  const handleInternalSubmit = (e) => {
    e.preventDefault();
    if (!enunciado.trim()) {
      alert('O enunciado da pergunta não pode estar vazio.');
      return;
    }

    const newQuestionData = {
      enunciado,
      tipo_pergunta: tipoPergunta,
      obrigatoria,
      ordem: existingQuestionsCount + 1, // A ordem será o próximo número na sequência
    };

    onAddQuestion(newQuestionData);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 mt-4">
      <h3 className="text-lg font-semibold mb-3">Nova Pergunta</h3>
      <form onSubmit={handleInternalSubmit}>
        <div className="mb-4">
          <label htmlFor="enunciado" className="block text-sm font-medium text-gray-700">
            Enunciado da Pergunta
          </label>
          <input
            type="text"
            id="enunciado"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Escreva a sua pergunta aqui"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="tipo_pergunta" className="block text-sm font-medium text-gray-700">
            Tipo de Pergunta
          </label>
          <select
            id="tipo_pergunta"
            value={tipoPergunta}
            onChange={(e) => setTipoPergunta(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {questionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="obrigatoria"
              name="obrigatoria"
              type="checkbox"
              checked={obrigatoria}
              onChange={(e) => setObrigatoria(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="obrigatoria" className="ml-2 block text-sm text-gray-900">
              Pergunta Obrigatória
            </label>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Adicionar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddQuestionForm;
