import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizQuestions, submitQuizAttempt, getQuizQuestionTime } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { AlertTriangle, Clock, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const StudentQuizResponder = () => {
  const { quizApplicationId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [questionTime, setQuestionTime] = useState(5);
  const [timer, setTimer] = useState(questionTime);
  const timerRef = useRef(null);
  const nextButtonRef = useRef(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [occlusionAnswers, setOcclusionAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  useEffect(() => {
    const fetchTime = async () => {
      try {
        const data = await getQuizQuestionTime();
        setQuestionTime(data.time || 5);
      } catch (err) {
        console.error('Failed to fetch quiz question time, using default.', err);
        setQuestionTime(5);
      }
    };
    fetchTime();
  }, []);

  // Fetch quiz questions
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!currentUser?.id) {
      setError('ID de utilizador ausente.');
      setLoading(false);
      return;
    }

    const fetchQuizData = async () => {
      try {
        setLoading(true);
        const response = await getQuizQuestions(quizApplicationId);
        setQuiz(response.quiz);
        setQuestions(response.questions);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar quiz:', err);
        setError('Não foi possível carregar o quiz. Verifique se o ID da aplicação está correto ou se o quiz está ativo.');
        setLoading(false);
      }
    };

    fetchQuizData();
  }, [quizApplicationId, currentUser?.id, authLoading]);

  // Handle question timer
  useEffect(() => {
    if (!quizSubmitted && questions.length > 0 && currentQuestionIndex < questions.length) {
      timerRef.current = setInterval(() => {
        setTimer(prevTimer => {
          if (prevTimer <= 1) {
            clearInterval(timerRef.current);
            nextButtonRef.current?.click();
            return questionTime;
          }
          return prevTimer - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [currentQuestionIndex, questions.length, quizSubmitted, questionTime]);

  // Reset timer and answers when question changes
  useEffect(() => {
    setTimer(questionTime);
    setSelectedAnswer(null);
    setOcclusionAnswers({});
  }, [currentQuestionIndex, questionTime]);

  const handleAnswerSelect = (optionId) => {
    setSelectedAnswer(optionId);
  };

  const handleOcclusionInputChange = (occlusionId, value) => {
    setOcclusionAnswers(prev => ({
      ...prev,
      [occlusionId]: value,
    }));
  };

  const handleNextQuestion = () => {
    clearInterval(timerRef.current); // Stop current timer

    const currentAnswer = currentQuestion.question_type === 'image_occlusion_fill_in_the_blank'
      ? occlusionAnswers
      : selectedAnswer;

    const updatedAnswers = {
      ...userAnswers,
      [currentQuestion.id]: currentAnswer,
    };
    setUserAnswers(updatedAnswers); // Still update state for consistency

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // This is the last question, trigger submission with the final, complete answers
      handleSubmitQuiz(updatedAnswers);
    }
  };

  const handleSubmitQuiz = async (finalAnswers) => {
    setLoading(true);
    setError(null);
    try {
      const answersPayload = Object.keys(finalAnswers).map(questionId => ({
        question_id: questionId,
        chosen_option_id: finalAnswers[questionId],
      }));

      if (answersPayload.length === 0 || answersPayload.some(a => a.chosen_option_id === null || a.chosen_option_id === undefined)) {
        setError('Por favor, responda a todas as questões antes de submeter.');
        setLoading(false);
        return;
      }
      
      const response = await submitQuizAttempt(quizApplicationId, answersPayload);
      setQuizScore(response.score);
      setQuizSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao submeter quiz:', err);
      setError('Não foi possível submeter o quiz. Tente novamente.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">A carregar quiz...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500 flex items-center">
        <AlertTriangle className="mr-2" /> {error}
      </div>
    );
  }

  if (quizSubmitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto bg-white shadow-lg rounded-lg text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Quiz Submetido!</h1>
        <p className="text-xl text-gray-700 mb-6">A sua pontuação: <span className="font-semibold">{quizScore !== null ? `${quizScore.toFixed(2)}%` : 'Aguardando cálculo'}</span></p>
        <button
          onClick={() => navigate('/qualidade/student/quizzes')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700"
        >
          Voltar para Meus Quizzes
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div className="p-6">Nenhuma questão encontrada para este quiz.</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-lg rounded-lg">
      <h1 className="text-3xl font-bold text-indigo-800 mb-4">{quiz?.title || 'Quiz'}</h1>
      <p className="text-lg text-gray-600 mb-6">Questão {currentQuestionIndex + 1} de {questions.length}</p>

      <div className="flex items-center justify-between mb-4 text-gray-500">
        <div className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          <span>Tempo restante: {timer}s</span>
        </div>
        <button
          ref={nextButtonRef}
          onClick={handleNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1 && quizSubmitted} // Disable if last question and submitted
          className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 flex items-center"
        >
          Próxima <ChevronRight className="ml-2 w-5 h-5" />
        </button>
      </div>

      <div className="mb-6 p-4 border rounded-md bg-gray-50">
        {currentQuestion.question_type === 'image_occlusion_fill_in_the_blank' ? (
          <>
            <p className="text-xl font-medium text-gray-800">{currentQuestion.question_text.text}</p>
            {currentQuestion.question_text.imageUrl && (
              <img src={currentQuestion.question_text.imageUrl} alt="Question related" className="mt-4 max-w-full h-auto" />
            )}
            <div className="mt-4 space-y-2">
              {currentQuestion.question_text.occlusions.map((occlusion, index) => (
                <div key={occlusion.id} className="flex items-center">
                  <label htmlFor={`occlusion-${occlusion.id}`} className="text-gray-700 mr-2">Oclusão {index + 1}:</label>
                  <input
                    type="text"
                    id={`occlusion-${occlusion.id}`}
                    value={occlusionAnswers[occlusion.id] || ''}
                    onChange={(e) => handleOcclusionInputChange(occlusion.id, e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                    placeholder={`Resposta para Oclusão ${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          // Default rendering for multiple-choice/true-false questions
          <>
            {typeof currentQuestion.question_text === 'object' ? (
              <p className="text-xl font-medium text-gray-800">{currentQuestion.question_text.text}</p>
            ) : (
              <p className="text-xl font-medium text-gray-800">{currentQuestion.question_text}</p>
            )}
            {currentQuestion.question_text.imageUrl && (
              <img src={currentQuestion.question_text.imageUrl} alt="Question related" className="mt-4 max-w-full h-auto" />
            )}
          </>
        )}
      </div>

      {currentQuestion.question_type !== 'image_occlusion_fill_in_the_blank' && (
        <div className="space-y-3 mt-4">
          {currentQuestion.options.map(option => (
            <button
              key={option.id}
              onClick={() => handleAnswerSelect(option.id)}
              className={`w-full text-left p-3 border rounded-md flex items-center transition-colors duration-200
                ${selectedAnswer === option.id
                  ? 'bg-indigo-100 border-indigo-500 text-indigo-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
              `}
            >
              {selectedAnswer === option.id ? <CheckCircle className="w-5 h-5 mr-3" /> : <XCircle className="w-5 h-5 mr-3 opacity-0" />}
              {option.text}
            </button>
          ))}
        </div>
      )}

      {currentQuestionIndex === questions.length - 1 && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => {
              const lastAnswer = currentQuestion.question_type === 'image_occlusion_fill_in_the_blank'
                ? occlusionAnswers
                : selectedAnswer;
              const finalAnswers = {
                ...userAnswers,
                [currentQuestion.id]: lastAnswer,
              };
              handleSubmitQuiz(finalAnswers);
            }}
            disabled={quizSubmitted}
            className="px-6 py-3 bg-green-600 text-white rounded-md shadow-md hover:bg-green-700 disabled:opacity-50"
          >
            Submeter Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentQuizResponder;