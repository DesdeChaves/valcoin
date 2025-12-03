import React from 'react';

const QuestionRenderer = ({ question, answer, onAnswerChange }) => {
    const renderInput = () => {
        const inputName = `question-${question.id}`;
        switch (question.tipo_pergunta) {
            case 'texto_curto':
                return (
                    <input
                        type="text"
                        name={inputName}
                        value={answer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required={question.obrigatoria}
                    />
                );
            case 'texto_longo':
                return (
                    <textarea
                        name={inputName}
                        value={answer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                        required={question.obrigatoria}
                    />
                );
            case 'escolha_multipla':
            case 'lista_suspensa':
                return (
                    <select
                        name={inputName}
                        value={answer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="block appearance-none w-full bg-white border border-gray-400 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
                        required={question.obrigatoria}
                    >
                        <option value="">Selecione uma opção</option>
                        {question.options.map(option => (
                            <option key={option.id} value={option.id}>{option.texto}</option>
                        ))}
                    </select>
                );
            case 'caixas_selecao':
                return (
                    <div className="flex flex-col">
                        {question.options.map(option => (
                            <label key={option.id} className="inline-flex items-center mt-2">
                                <input
                                    type="checkbox"
                                    name={inputName}
                                    value={option.id}
                                    checked={answer && answer.includes(option.id)}
                                    onChange={(e) => {
                                        const newAnswer = e.target.checked
                                            ? [...(answer || []), option.id]
                                            : (answer || []).filter(id => id !== option.id);
                                        onAnswerChange(question.id, newAnswer);
                                    }}
                                    className="form-checkbox h-5 w-5 text-blue-600"
                                />
                                <span className="ml-2 text-gray-700">{option.texto}</span>
                            </label>
                        ))}
                    </div>
                );
            case 'escala_linear':
                const min = question.escala_min || 0;
                const max = question.escala_max || 5;
                return (
                    <div className="flex flex-col items-start mt-2">
                        <div className="flex justify-between w-full text-xs text-gray-600">
                            <span>{question.escala_label_min || min}</span>
                            <span>{question.escala_label_max || max}</span>
                        </div>
                        <input
                            type="range"
                            min={min}
                            max={max}
                            name={inputName}
                            value={answer || min}
                            onChange={(e) => onAnswerChange(question.id, parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            required={question.obrigatoria}
                        />
                        <span className="text-sm font-medium mt-1">Valor selecionado: {answer || min}</span>
                    </div>
                );
            case 'data':
                return (
                    <input
                        type="date"
                        name={inputName}
                        value={answer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required={question.obrigatoria}
                    />
                );
            case 'hora':
                return (
                    <input
                        type="time"
                        name={inputName}
                        value={answer || ''}
                        onChange={(e) => onAnswerChange(question.id, e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required={question.obrigatoria}
                    />
                );
            case 'upload_ficheiro':
                return (
                    // This would require a more complex file upload handling
                    // For now, a placeholder input
                    <input
                        type="file"
                        name={inputName}
                        onChange={(e) => onAnswerChange(question.id, e.target.files)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required={question.obrigatoria}
                    />
                );
            default:
                return (
                    <p className="text-red-500">Tipo de pergunta não suportado: {question.tipo_pergunta}</p>
                );
        }
    };

    return (
        <div className="mb-6 p-4 border rounded-md shadow-sm bg-gray-50">
            <label className="block text-gray-800 text-base font-semibold mb-2">
                {question.ordem}. {question.enunciado} {question.obrigatoria && <span className="text-red-500">*</span>}
            </label>
            {question.descricao && (
                <p className="text-gray-600 text-sm mb-3">{question.descricao}</p>
            )}
            {renderInput()}
        </div>
    );
};

export default QuestionRenderer;
