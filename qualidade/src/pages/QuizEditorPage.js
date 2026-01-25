import React, { useState, useEffect, useCallback } from 'react';
import apiClient, { getProfessorDisciplinaTurma } from '../services/api';
import QuizQuestionEditor from '../components/QuizQuestionEditor'; // Import the new component
import { PlusCircle, Save } from 'lucide-react'; // Import icons for buttons
import useAuth from '../hooks/useAuth'; // Import useAuth hook
import { useNavigate, useParams } from 'react-router-dom';

const QuizEditorPage = () => {
  const { user: currentUser } = useAuth(); // Get currentUser from useAuth
  const navigate = useNavigate();
  const { quizId } = useParams(); // Get quizId from URL for editing
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState('');
  const [selectedFlashcardIds, setSelectedFlashcardIds] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [isEditingQuiz, setIsEditingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [showCustomQuestionForm, setShowCustomQuestionForm] = useState(false);
  const [customQuestionType, setCustomQuestionType] = useState('multiple_choice');
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customOptions, setCustomOptions] = useState([
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ]);
  const [customCorrectAnswerId, setCustomCorrectAnswerId] = useState('');

  useEffect(() => {
    // This effect runs once to determine if we are in "edit" or "create" mode
    // and fetches existing quiz data if needed.
    const initializePage = async () => {
      if (quizId) {
        // EDIT MODE
        try {
          const response = await apiClient.get(`/qualidade/quizzes/${quizId}`);
          const quizData = response.data.data;
          
          setQuizTitle(quizData.title);
          setSelectedDiscipline(quizData.discipline_id);
          // Transform fetched questions to match the component's state structure
          const formattedQuestions = quizData.questions.map(q => ({
            flashcardId: q.flashcard_id || `custom-${q.id}`,
            questionText: q.question_text,
            questionType: q.question_type,
            answers: q.options.map(opt => ({
              id: opt.id,
              text: opt.text,
              isCorrect: opt.id === q.correct_answer_id,
            })),
            flashcardDetails: { type: q.question_type },
          }));
          setQuizQuestions(formattedQuestions);
          setIsEditingQuiz(true); // Go directly to the editing interface
        } catch (err) {
          console.error('Erro ao carregar quiz para edição:', err);
          setError('Não foi possível carregar o quiz para edição.');
        }
      }
      // For both modes, we need to fetch the user's disciplines.
      // The rest of the setup continues in the next useEffect.
    };

    initializePage();
  }, [quizId]);

  useEffect(() => {
    if (!currentUser || !currentUser.id) {
        // Wait until currentUser is loaded and has an ID
        setLoading(true);
        return;
    }
    
    // Only fetch if professor or admin
    if (currentUser.tipo_utilizador !== 'PROFESSOR' && currentUser.tipo_utilizador !== 'ADMIN') {
        setError('Acesso negado. Apenas professores e administradores podem criar quizzes.');
        setLoading(false);
        return;
    }

    const fetchDisciplines = async () => {
      try {
        const response = await getProfessorDisciplinaTurma(currentUser.id);
        const myDisciplines = response.map(dt => ({
          id: dt.disciplina_id,
          name: dt.disciplina_nome || `Disciplina ${dt.disciplina_id}`,
          classId: dt.turma_id,
        }));
        setDisciplines(myDisciplines);
        if (myDisciplines.length > 0 && !selectedDiscipline) {
          setSelectedDiscipline(myDisciplines[0].id);
        } else {
          // If no disciplines, and not in edit mode, show error
          if (!quizId) setError('Não encontradas disciplinas associadas.');
        }
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as tuas disciplinas.');
        setLoading(false);
      }
    };

    fetchDisciplines();
  }, [currentUser?.id, currentUser?.tipo_utilizador, quizId]);

  useEffect(() => {
    if (selectedDiscipline) {
      const fetchFlashcards = async () => {
        setFlashcardsLoading(true);
        setFlashcardsError('');
        try {
          const response = await apiClient.get('/memoria/flashcards', {
            params: { discipline_id: selectedDiscipline }
          });
          setFlashcards(response.data.data);
          setSelectedFlashcardIds([]); // Clear selected flashcards when discipline changes
          setFlashcardsLoading(false);
        } catch (err) {
          console.error('Erro ao carregar flashcards:', err);
          setFlashcardsError('Não foi possível carregar os flashcards para esta disciplina.');
          setFlashcardsLoading(false);
        }
      };
      fetchFlashcards();
    }
  }, [selectedDiscipline]);

  const handleFlashcardSelect = (flashcardId) => {
    setSelectedFlashcardIds(prev =>
      prev.includes(flashcardId)
        ? prev.filter(id => id !== flashcardId)
        : [...prev, flashcardId]
    );
  };

  const handleAdvanceToQuizCreation = () => {
    // Filter flashcards that are selected
    const selectedFc = flashcards.filter(fc => selectedFlashcardIds.includes(fc.id));
    
    // Get IDs of flashcards that are already part of the quiz to avoid duplicates
    const existingFlashcardIds = quizQuestions.map(q => q.flashcardId);
    
    // Filter out already existing flashcards from the selection
    const newSelectedFc = selectedFc.filter(fc => !existingFlashcardIds.includes(fc.id));

    // Create new question objects from the newly selected flashcards
    const newQuizQuestions = newSelectedFc.map(fc => {
      let questionText = '';
      let initialAnswers = [];
      let questionType = '';

      // ... (rest of the mapping logic remains the same)
      switch (fc.type) {
        case 'basic':
          questionText = { text: fc.front || 'Pergunta (flashcard básico)' };
          questionType = 'multiple_choice';
          initialAnswers = [
            { id: 'a', text: fc.back || '', isCorrect: true },
            { id: 'b', text: '', isCorrect: false },
            { id: 'c', text: '', isCorrect: false },
            { id: 'd', text: '', isCorrect: false },
          ];
          break;
        case 'cloze':
          const clozeMatches = [...(fc.cloze_text || '').matchAll(/\{\{c(\d+)::(.*?)\}\}/g)];
          let clozeQuestion = fc.cloze_text || 'Completar (flashcard cloze)';

          // Replace all clozes with [___] for the question text
          clozeQuestion = clozeQuestion.replace(/\{\{c(\d+)::(.*?)\}\}/g, '[___]');
          questionText = { text: `Completa: ${clozeQuestion}` };
          questionType = 'multiple_choice';
          // The correct answer will be all cloze answers concatenated
          const correctClozeAnswers = clozeMatches.map(match => match[2]).join(', ');
          initialAnswers = [
            { id: 'a', text: correctClozeAnswers, isCorrect: true },
            { id: 'b', text: '', isCorrect: false },
            { id: 'c', text: '', isCorrect: false },
            { id: 'd', text: '', isCorrect: false },
          ];
          break;
        case 'image_occlusion':
          questionText = {
            text: fc.front || 'Preencha os espaços em branco identificando o conceito.',
            imageUrl: fc.image_url || null,
            occlusions: fc.occlusion_data.map(occ => ({ id: occ.id, x: occ.x, y: occ.y, width: occ.width, height: occ.height }))
          };
          questionType = 'image_occlusion_fill_in_the_blank';
          initialAnswers = fc.occlusion_data.map((occ, index) => ({
            id: String.fromCharCode(97 + index), // 'a', 'b', 'c', ...
            text: occ.label,
            isCorrect: true, // For occlusion, all labels are "correct" answers for comparison
          }));
          break;
        case 'image_text':
          questionText = {
            text: fc.front || 'Pergunta (flashcard com imagem e texto)',
            imageUrl: fc.image_url || null
          };
          questionType = 'multiple_choice';
          initialAnswers = [
            { id: 'a', text: fc.back || '', isCorrect: true },
            { id: 'b', text: '', isCorrect: false },
            { id: 'c', text: '', isCorrect: false },
            { id: 'd', text: '', isCorrect: false },
          ];
          break;
        default:
          questionText = { text: `Baseado no flashcard: "${fc.front || 'N/A'}" - "${fc.back || 'N/A'}"` };
          questionType = 'multiple_choice';
          initialAnswers = [
            { id: 'a', text: fc.back || '', isCorrect: true },
            { id: 'b', text: '', isCorrect: false },
            { id: 'c', text: '', isCorrect: false },
            { id: 'd', text: '', isCorrect: false },
          ];
          break;
      }

      return {
        flashcardId: fc.id,
        questionText: questionText,
        answers: initialAnswers,
        questionType: questionType,
        flashcardDetails: fc,
      };
    });

    // Append new questions to the existing ones
    setQuizQuestions(prevQuestions => [...prevQuestions, ...newQuizQuestions]);
    setIsEditingQuiz(true);
  };

  useEffect(() => {
    // Reset custom question form when type changes
    setCustomQuestionText('');
    setCustomOptions([
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '', isCorrect: false },
      { id: 'd', text: '', isCorrect: false },
    ]);
    setCustomCorrectAnswerId('');
    if (customQuestionType === 'true_false') {
      setCustomCorrectAnswerId('true'); // Default for True/False
    }
  }, [customQuestionType]);

  const handleCustomOptionChange = (id, value) => {
    setCustomOptions(prev => prev.map(opt => (opt.id === id ? { ...opt, text: value } : opt)));
  };

  const handleAddCustomOption = () => {
    const newId = String.fromCharCode(97 + customOptions.length); // 'a', 'b', 'c', ...
    setCustomOptions(prev => [...prev, { id: newId, text: '' }]);
  };

  const handleRemoveCustomOption = (id) => {
    setCustomOptions(prev => prev.filter(opt => opt.id !== id));
    // If the removed option was the correct answer, reset correct answer
    if (customCorrectAnswerId === id) {
      setCustomCorrectAnswerId('');
    }
  };

  const handleAddCustomQuestion = () => {
    if (!customQuestionText.trim()) {
      alert('Por favor, insira o texto da questão.');
      return;
    }

    let questionOptions = [];
    let correctAnswer = '';

    if (customQuestionType === 'multiple_choice') {
      const validOptions = customOptions.filter(opt => opt.text.trim() !== '');
      if (validOptions.length < 2) {
        alert('Para questões de múltipla escolha, por favor, insira pelo menos duas opções válidas.');
        return;
      }
      if (!customCorrectAnswerId) {
        alert('Por favor, selecione a resposta correta.');
        return;
      }
      questionOptions = validOptions;
      correctAnswer = customCorrectAnswerId;
    } else if (customQuestionType === 'true_false') {
      questionOptions = [
        { id: 'true', text: 'Verdadeiro' },
        { id: 'false', text: 'Falso' },
      ];
      correctAnswer = customCorrectAnswerId || 'true'; // Default to true if not selected
    }

    const newQuestion = {
      // Generate a unique ID for custom questions as they don't have flashcardId
      flashcardId: `custom-${Date.now()}`, 
      questionText: { text: customQuestionText }, // Custom questions are text-only for now
      questionType: customQuestionType, // Add questionType from state
      answers: questionOptions.map(opt => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.id === correctAnswer,
      })),
      flashcardDetails: { type: customQuestionType }, // Store type for rendering hints
    };

    setQuizQuestions(prev => [...prev, newQuestion]);
    
    // Reset form
    setCustomQuestionText('');
    setCustomOptions([
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '', isCorrect: false },
      { id: 'd', text: '', isCorrect: false },
    ]);
    setCustomCorrectAnswerId('');
    setShowCustomQuestionForm(false);
  };

  const handleUpdateQuestion = useCallback((questionIdentifier, updatedQuestion) => {
    setQuizQuestions(prev => {
      const newState = prev.map(q =>
        (q.flashcardId === questionIdentifier) ? { ...q, ...updatedQuestion } : q
      );
      return newState;
    });
  }, [setQuizQuestions]);

  const handleDeleteQuestion = (questionIdentifier) => {
    setQuizQuestions(prev => prev.filter(q => q.flashcardId !== questionIdentifier));
  };

  const handleSaveQuiz = async () => {
    // Basic validation before saving
    if (!quizTitle.trim()) {
      alert('Por favor, defina um título para o quiz.');
      return;
    }
    if (quizQuestions.length === 0) {
      alert('Por favor, adicione pelo menos uma pergunta ao quiz.');
      return;
    }
    const invalidQuestions = quizQuestions.filter(q => {
      // For non-occlusion questions, ensure exactly one correct answer is selected.
      return q.questionType !== 'image_occlusion_fill_in_the_blank' && q.answers.filter(a => a.isCorrect).length !== 1;
    });
    if (invalidQuestions.length > 0) {
      alert('Todas as perguntas (exceto as de oclusão de imagem) devem ter exatamente uma resposta correta.');
      return;
    }


    const selectedDisciplineObject = disciplines.find(d => d.id === selectedDiscipline);

    const quizData = {
      disciplineId: selectedDiscipline,
      title: quizTitle,
      questions: quizQuestions.map(q => ({
        flashcardId: q.flashcardId,
        questionText: q.questionText,
        questionType: q.questionType, // Add questionType
        answers: q.answers,
      })),
      classId: selectedDisciplineObject?.classId,
    };

    try {
      if (quizId) {
        // Update existing quiz
        await apiClient.put(`/qualidade/quizzes/${quizId}`, quizData);
        alert('Quiz atualizado com sucesso!');
      } else {
        // Create new quiz
        await apiClient.post('/qualidade/quizzes', quizData);
        alert('Quiz salvo com sucesso!');
      }
      navigate('/quizzes'); // Redirect to quiz management page after save/update
    } catch (error) {
      console.error('Erro ao salvar quiz:', error);
      alert('Erro ao salvar quiz.');
    }
  };

  if (loading) {
    return <div className="p-6">A carregar disciplinas...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-800">Criar Novo Quiz</h1>

      {!isEditingQuiz ? (
        <>
          {disciplines.length > 0 && (
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <label htmlFor="discipline-select" className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Disciplina:
              </label>
              <select
                id="discipline-select"
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                {disciplines.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {selectedDiscipline && (
            <div className="mt-8 bg-white shadow rounded-lg p-4">
              <h2 className="text-2xl font-semibold mb-4 text-indigo-700">
                Flashcards para {disciplines.find(d => d.id === selectedDiscipline)?.name}
              </h2>

              {flashcardsLoading ? (
                <p>A carregar flashcards...</p>
              ) : flashcardsError ? (
                <p className="text-red-500">Erro ao carregar flashcards: {flashcardsError}</p>
              ) : flashcards.length === 0 ? (
                <p>Nenhum flashcard encontrado para esta disciplina.</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4">Selecione os flashcards para incluir no quiz ({selectedFlashcardIds.length} selecionados):</p>
                  <div className="space-y-3">
                    {flashcards.map(flashcard => (
                      <div key={flashcard.id} className="flex items-center bg-gray-50 p-3 rounded-md shadow-sm">
                        <input
                          type="checkbox"
                          id={`flashcard-${flashcard.id}`}
                          checked={selectedFlashcardIds.includes(flashcard.id)}
                          onChange={() => handleFlashcardSelect(flashcard.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`flashcard-${flashcard.id}`} className="ml-3 block text-sm font-medium text-gray-700 flex-1">
                          {flashcard.front} - {flashcard.back} (Tipo: {flashcard.type})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleAdvanceToQuizCreation}
                disabled={selectedFlashcardIds.length === 0}
                className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Avançar para Criação do Quiz
              </button>
            </div>
          )}
        </>
      ) : (
        // Quiz editing interface
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Editar Perguntas do Quiz</h2>
          
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <label htmlFor="quiz-title" className="block text-sm font-medium text-gray-700 mb-2">
              Título do Quiz:
            </label>
            <input
              type="text"
              id="quiz-title"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Quiz de Revisão - Módulo 1"
            />
          </div>

          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowCustomQuestionForm(!showCustomQuestionForm)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md shadow-md hover:bg-purple-700 flex items-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              {showCustomQuestionForm ? 'Fechar Formulário de Questão' : 'Adicionar Questão Personalizada'}
            </button>
          </div>

          {showCustomQuestionForm && (
            // Custom Question Form
            <div className="bg-white shadow rounded-lg p-4 mb-6">
              <h3 className="text-xl font-semibold mb-4">Nova Questão Personalizada</h3>
              <div className="space-y-4">
                {/* Question Type */}
                <div>
                  <label htmlFor="custom-question-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Questão</label>
                  <select
                    id="custom-question-type"
                    value={customQuestionType}
                    onChange={(e) => setCustomQuestionType(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="multiple_choice">Múltipla Escolha</option>
                    <option value="true_false">Verdadeiro/Falso</option>
                  </select>
                </div>

                {/* Question Text */}
                <div>
                  <label htmlFor="custom-question-text" className="block text-sm font-medium text-gray-700 mb-1">Texto da Questão</label>
                  <textarea
                    id="custom-question-text"
                    rows="3"
                    value={customQuestionText}
                    onChange={(e) => setCustomQuestionText(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                    placeholder="Introduza o texto da questão"
                  ></textarea>
                </div>

                {/* Options for Multiple Choice */}
                {customQuestionType === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Opções de Resposta</label>
                    {customOptions.map((option, index) => (
                      <div key={option.id} className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => handleCustomOptionChange(option.id, e.target.value)}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                          placeholder={`Opção ${option.id.toUpperCase()}`}
                        />
                        <input
                          type="radio"
                          name="correct-answer"
                          checked={customCorrectAnswerId === option.id}
                          onChange={() => setCustomCorrectAnswerId(option.id)}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        {customOptions.length > 2 && ( // Allow removing only if more than 2 options
                          <button onClick={() => handleRemoveCustomOption(option.id)} className="text-red-500 hover:text-red-700">X</button>
                        )}
                      </div>
                    ))}
                    <button onClick={handleAddCustomOption} className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
                      Adicionar Opção
                    </button>
                  </div>
                )}

                {/* Options for True/False */}
                {customQuestionType === 'true_false' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resposta Correta</label>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="true-option"
                          name="true-false-correct"
                          checked={customCorrectAnswerId === 'true'}
                          onChange={() => setCustomCorrectAnswerId('true')}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        <label htmlFor="true-option" className="ml-2 block text-sm text-gray-900">Verdadeiro</label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="false-option"
                          name="true-false-correct"
                          checked={customCorrectAnswerId === 'false'}
                          onChange={() => setCustomCorrectAnswerId('false')}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                        />
                        <label htmlFor="false-option" className="ml-2 block text-sm text-gray-900">Falso</label>
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={handleAddCustomQuestion} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md shadow-md hover:bg-green-700">
                  Adicionar Questão ao Quiz
                </button>
              </div>
            </div>
          )}

          {quizQuestions.length === 0 ? (
            <p>Nenhuma pergunta selecionada para o quiz.</p>
          ) : (
            <div className="space-y-6">
              {quizQuestions.map(q => (
                <QuizQuestionEditor
                  key={q.flashcardId}
                  questionIdentifier={q.flashcardId} // Pass this as the unique identifier
                  flashcard={q.flashcardDetails}
                  initialQuestionText={q.questionText}
                  initialAnswers={q.answers}
                  questionType={q.questionType}
                  onUpdateQuestion={handleUpdateQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                />
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button
              onClick={() => setIsEditingQuiz(false)}
              className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Voltar para Seleção de Flashcards
            </button>
            <button
              onClick={handleSaveQuiz}
              disabled={!quizTitle || quizQuestions.length === 0 || quizQuestions.some(q => q.answers.filter(a => a.isCorrect).length !== 1)}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 flex items-center"
            >
              <Save className="w-5 h-5 mr-2" /> Salvar Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizEditorPage;
