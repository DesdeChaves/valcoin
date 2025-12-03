import React, { useState, useEffect } from 'react';

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

const typesWithOptionsMenu = ['escolha_multipla', 'caixas_selecao', 'lista_suspensa'];

const EditQuestionForm = ({ question, onUpdateQuestion, onCancel }) => {
  const [enunciado, setEnunciado] = useState('');
  const [tipoPergunta, setTipoPergunta] = useState('texto_curto');
  const [obrigatoria, setObrigatoria] = useState(false);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (question) {
      setEnunciado(question.enunciado);
      setTipoPergunta(question.tipo_pergunta);
      setObrigatoria(question.obrigatoria);

      if (typesWithOptionsMenu.includes(question.tipo_pergunta)) {
        const fetchOptions = async () => {
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`/api/qualidade/questions/${question.id}/options`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setOptions(data);
        };
        fetchOptions();
      }
    }
  }, [question]);

  const handleOptionChange = (index, newText) => {
    const newOptions = [...options];
    newOptions[index].texto = newText;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { texto: '', ordem: options.length + 1 }]);
  };

  const removeOption = (index) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleInternalSubmit = (e) => {
    e.preventDefault();
    if (!enunciado.trim()) {
      alert('O enunciado da pergunta não pode estar vazio.');
      return;
    }

    const updatedQuestionData = {
      enunciado,
      tipo_pergunta: tipoPergunta,
      obrigatoria,
    };

    const updatedOptions = typesWithOptionsMenu.includes(tipoPergunta) ? options : [];

    onUpdateQuestion(question.id, updatedQuestionData, updatedOptions);
  };

  return (
    <div className="p-4 border rounded-lg bg-blue-50 mt-4 w-full">
      <h3 className="text-lg font-semibold mb-3">Editar Pergunta</h3>
      <form onSubmit={handleInternalSubmit}>
        {/* Enunciado, Tipo Pergunta, Obrigatoria fields... */}
        <div className="mb-4">
          <label htmlFor={`enunciado-${question.id}`} className="block text-sm font-medium text-gray-700">
            Enunciado da Pergunta
          </label>
          <input
            type="text"
            id={`enunciado-${question.id}`}
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor={`tipo_pergunta-${question.id}`} className="block text-sm font-medium text-gray-700">
            Tipo de Pergunta
          </label>
          <select
            id={`tipo_pergunta-${question.id}`}
            value={tipoPergunta}
            onChange={(e) => setTipoPergunta(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {questionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {typesWithOptionsMenu.includes(tipoPergunta) && (
          <div className="mb-4 pl-4 border-l-2 border-blue-200">
            <h4 className="text-md font-semibold mb-2">Opções</h4>
            {options.map((opt, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  value={opt.texto}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="block w-full px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  placeholder={`Opção ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-blue-600 hover:text-blue-800 text-sm mt-2"
            >
              + Adicionar Opção
            </button>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center">
            <input
              id={`obrigatoria-${question.id}`}
              name="obrigatoria"
              type="checkbox"
              checked={obrigatoria}
              onChange={(e) => setObrigatoria(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={`obrigatoria-${question.id}`} className="ml-2 block text-sm text-gray-900">
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditQuestionForm;
