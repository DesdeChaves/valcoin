import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import useAuth from '../hooks/useAuth';
import { BarChart2, ArrowLeftCircle, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const QuizResultsPage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();

  const [quizResults, setQuizResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!currentUser?.id) {
      setError('ID de utilizador ausente.');
      setLoading(false);
      return;
    }

    const fetchQuizResults = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/qualidade/quizzes/${quizId}/results`);
        setQuizResults(response.data.data);
      } catch (err) {
        console.error('Erro ao carregar resultados do quiz:', err);
        setError('Não foi possível carregar os resultados do quiz. Verifique o ID do quiz.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizResults();
  }, [quizId, currentUser?.id, authLoading]);

  const toggleAttempt = (attemptId) => {
    setExpandedAttempt(expandedAttempt === attemptId ? null : attemptId);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-pulse text-orange-600">A carregar resultados...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 flex items-center text-red-700">
            <AlertTriangle className="mr-3 w-6 h-6" /> 
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-600">
            Nenhum resultado encontrado para este quiz.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-orange-800 flex items-center">
            <BarChart2 className="w-8 h-8 mr-3 text-orange-600" /> 
            {quizResults.quizTitle}
          </h1>
          <button
            onClick={() => navigate('/quizzes')}
            className="px-5 py-2.5 bg-white text-orange-700 rounded-xl shadow-md hover:shadow-lg hover:bg-orange-50 transition-all flex items-center font-medium border border-orange-200"
          >
            <ArrowLeftCircle className="w-5 h-5 mr-2" /> 
            Voltar
          </button>
        </div>

        {/* Quiz Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-orange-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-orange-800 mb-2">Informações do Quiz</h2>
              <p className="text-gray-700"><span className="font-medium">Disciplina:</span> {quizResults.disciplineName}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-orange-600">{quizResults.attempts.length}</div>
              <div className="text-sm text-gray-600">Tentativas</div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-orange-100">
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">Resultados dos Alunos</h2>
          </div>

          {quizResults.attempts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum aluno tentou este quiz ainda.
            </div>
          ) : (
            <div className="divide-y divide-orange-100">
              {quizResults.attempts.map((attempt) => (
                <div key={attempt.attempt_id} className="hover:bg-orange-50 transition-colors">
                  {/* Compact Row */}
                  <div
                    onClick={() => toggleAttempt(attempt.attempt_id)}
                    className="px-6 py-4 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-lg">{attempt.studentName}</h3>
                        <p className="text-sm text-gray-500">
                          Tentativa {attempt.attempt_number} • {new Date(attempt.submitTime).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">
                            {attempt.score !== null ? `${attempt.score.toFixed(0)}%` : 'N/A'}
                          </div>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-full font-semibold text-sm ${
                          attempt.passed 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {attempt.passed ? 'Aprovado' : 'Reprovado'}
                        </div>
                      </div>
                    </div>

                    <div className="ml-4">
                      {expandedAttempt === attempt.attempt_id ? (
                        <ChevronUp className="w-5 h-5 text-orange-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAttempt === attempt.attempt_id && (
                    <div className="px-6 pb-6 bg-orange-50/50">
                      <div className="bg-white rounded-xl p-5 border border-orange-200 shadow-sm">
                        <h4 className="text-lg font-semibold mb-4 text-orange-800 flex items-center">
                          <BarChart2 className="w-5 h-5 mr-2" />
                          Respostas Detalhadas
                        </h4>
                        <div className="space-y-4">
                          {attempt.answers.map((answer, idx) => (
                            <div 
                              key={answer.questionId} 
                              className="border-l-4 border-orange-300 pl-4 py-2 bg-white rounded-r"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {idx + 1}. {answer.questionText}
                              </p>
                              <div className="ml-4 space-y-1">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Resposta:</span>{' '}
                                  {typeof answer.chosenOptionId === 'object' && answer.chosenOptionId !== null ? (
                                    <span className="block mt-1">
                                      {Object.entries(answer.chosenOptionId).map(([occId, typedAnswer]) => (
                                        <span key={occId} className="block ml-2 text-gray-700">
                                          Oclusão {occId}: <span className="font-semibold">{typedAnswer}</span>
                                        </span>
                                      ))}
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-gray-700">{answer.chosenOptionId}</span>
                                  )}
                                </p>
                                <div className="flex items-center">
                                  {answer.isCorrect ? (
                                    <span className="flex items-center text-green-600 font-medium text-sm">
                                      <CheckCircle className="w-4 h-4 mr-1" /> Correto
                                    </span>
                                  ) : (
                                    <span className="flex items-center text-red-600 font-medium text-sm">
                                      <XCircle className="w-4 h-4 mr-1" /> Incorreto
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizResultsPage;
