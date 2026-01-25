import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, CheckCircle, Circle } from 'lucide-react';

const QuizQuestionEditor = ({ flashcard, initialQuestionText, initialAnswers, onUpdateQuestion, onDeleteQuestion, questionIdentifier, questionType: propQuestionType }) => {
  // Normalize initialQuestionText to always be an object with a 'text' property for consistency
  const [questionTextContent, setQuestionTextContent] = useState(
    typeof initialQuestionText === 'object' ? initialQuestionText.text : initialQuestionText
  );
  const [questionImageUrl, setQuestionImageUrl] = useState(
    typeof initialQuestionText === 'object' ? initialQuestionText.imageUrl : null
  );

  const [answers, setAnswers] = useState(initialAnswers.map(ans => ({ ...ans, id: ans.id || Math.random().toString(36).substring(7) })));
  const questionType = propQuestionType; // Use propQuestionType here

  // Effect to update parent when local state changes
  useEffect(() => {
    onUpdateQuestion(questionIdentifier, {
      questionText: { text: questionTextContent, imageUrl: questionImageUrl }, // Reconstruct object for parent
      answers,
      questionType: questionType,
    });
  }, [questionTextContent, questionImageUrl, answers, questionIdentifier, onUpdateQuestion, questionType]);


  const handleAnswerTextChange = (id, newText) => {
    setAnswers(prev =>
      prev.map(answer =>
        answer.id === id ? { ...answer, text: newText } : answer
      )
    );
  };

  const handleCorrectAnswerChange = (id) => {
    setAnswers(prev =>
      prev.map(answer => ({
        ...answer,
        isCorrect: answer.id === id,
      }))
    );
  };

  const addAnswerOption = () => {
    setAnswers(prev => [
      ...prev,
      { id: Math.random().toString(36).substring(7), text: '', isCorrect: false },
    ]);
  };

  const removeAnswerOption = (id) => {
    setAnswers(prev => prev.filter(answer => answer.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Editar Pergunta do Quiz ({flashcard.type})</h3>
        <button
          onClick={() => onDeleteQuestion(questionIdentifier)}
          className="text-red-500 hover:text-red-700 flex items-center"
        >
          <Trash2 className="w-5 h-5 mr-1" /> Remover
        </button>
      </div>

      {/* Display image if available */}
      {questionImageUrl && (
        <div className="mb-4">
          <p className="block text-sm font-medium text-gray-700 mb-2">Imagem da Questão:</p>
          <img src={questionImageUrl} alt="Question" className="max-w-xs h-auto rounded-md shadow-sm" />
        </div>
      )}

      <div className="mb-4">
        <label htmlFor={`question-text-${questionIdentifier}`} className="block text-sm font-medium text-gray-700 mb-2">
          Pergunta:
        </label>
        <textarea
          id={`question-text-${questionIdentifier}`}
          value={questionTextContent}
          onChange={(e) => setQuestionTextContent(e.target.value)}
          rows="3"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Escreva a pergunta do quiz aqui..."
        ></textarea>
        {flashcard.type === 'basic' && (
            <p className="text-xs text-gray-500 mt-1">Sugestão: "Na flashcard original, esta é a Frente."</p>
        )}
        {flashcard.type === 'cloze' && (
             <p className="text-xs text-gray-500 mt-1">Sugestão: "Na flashcard original, a lacuna era: {flashcard.cloze_text}"</p>
        )}
        {flashcard.type === 'image_occlusion' && (
             <p className="text-xs text-gray-500 mt-1">Sugestão: "Na flashcard original, a área oculta é: {flashcard.occlusion_data?.[0]?.label}"</p>
        )}
      </div>

      {/* Render options only if not image occlusion fill-in-the-blank */}
      {questionType !== 'image_occlusion_fill_in_the_blank' && (
        <div className="mb-4">
          <p className="block text-sm font-medium text-gray-700 mb-2">Opções de Resposta:</p>
          <div className="space-y-3">
            {answers.map(answer => (
              <div key={answer.id} className="flex items-center space-x-3">
                <button
                  onClick={() => handleCorrectAnswerChange(answer.id)}
                  className={`flex-shrink-0 ${answer.isCorrect ? 'text-green-500' : 'text-gray-300'} hover:text-green-600`}
                >
                  {answer.isCorrect ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => handleAnswerTextChange(answer.id, e.target.value)}
                  className="flex-grow border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={`Opção ${answer.id}`}
                />
                {answers.length > 1 && (
                  <button
                    onClick={() => removeAnswerOption(answer.id)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addAnswerOption}
            className="mt-4 flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <PlusCircle className="w-5 h-5 mr-1" /> Adicionar Opção
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizQuestionEditor;