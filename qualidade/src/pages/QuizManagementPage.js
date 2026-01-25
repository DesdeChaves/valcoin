import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Edit, Trash2, Send, BarChart2, BookOpen, List, Copy } from 'lucide-react';
import ApplyQuizModal from '../components/ApplyQuizModal';
import QuizApplicationsModal from '../components/QuizApplicationsModal';
import DuplicateQuizModal from '../components/DuplicateQuizModal';
import { duplicateQuiz } from '../services/api';

const QuizManagementPage = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplyQuizModal, setShowApplyQuizModal] = useState(false);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [quizToApplyId, setQuizToApplyId] = useState(null);
  const [quizToApplyDisciplineId, setQuizToApplyDisciplineId] = useState(null);
  const [selectedQuizForApplications, setSelectedQuizForApplications] = useState(null);
  const [quizToDuplicate, setQuizToDuplicate] = useState(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!currentUser || !currentUser.id) {
      setError('Acesso negado. Por favor, faça login para gerir quizzes.');
      setLoading(false);
      return;
    }

    if (currentUser.tipo_utilizador !== 'PROFESSOR' && currentUser.tipo_utilizador !== 'ADMIN') {
      setError('Acesso negado. Apenas professores e administradores podem gerir quizzes.');
      setLoading(false);
      return;
    }

    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/qualidade/quizzes/professor/${currentUser.id}`);
        setQuizzes(response.data.data);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar quizzes:', err);
        setError('Não foi possível carregar os quizzes.');
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [currentUser, authLoading]);

  const handleCreateQuiz = () => {
    navigate('/quizzes/criar');
  };

  const handleApplyQuiz = (quizId, disciplineId) => {
    setQuizToApplyId(quizId);
    setQuizToApplyDisciplineId(disciplineId);
    setShowApplyQuizModal(true);
  };

  const handleCloseApplyQuizModal = () => {
    setShowApplyQuizModal(false);
    setQuizToApplyId(null);
    setQuizToApplyDisciplineId(null);
  };

  const handleConfirmApplyQuiz = async (quizId, turmaIds, startTime, endTime) => {
    try {
      await apiClient.post('/qualidade/quiz-applications', {
        quizId,
        turmaIds,
        startTime,
        endTime,
      });
      alert('Quiz aplicado com sucesso!');
      handleCloseApplyQuizModal();
    } catch (error) {
      console.error('Erro ao aplicar quiz:', error);
      alert('Erro ao aplicar quiz.');
    }
  };

  const handleManageApplications = (quiz) => {
    setSelectedQuizForApplications(quiz);
    setShowApplicationsModal(true);
  };

  const handleCloseApplicationsModal = () => {
    setShowApplicationsModal(false);
    setSelectedQuizForApplications(null);
  };

  const handleDuplicateQuiz = (quiz) => {
    setQuizToDuplicate(quiz);
    setShowDuplicateModal(true);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setQuizToDuplicate(null);
  };

  const handleConfirmDuplicate = async (duplicateData) => {
    try {
      const response = await duplicateQuiz(duplicateData.originalQuizId, {
        newTitle: duplicateData.newTitle,
        newDisciplineId: duplicateData.newDisciplineId,
      });
      
      alert(`Quiz duplicado com sucesso! ${response.data.questionsCount} perguntas foram copiadas.`);
      handleCloseDuplicateModal();
      
      // Refresh the quizzes list
      const refreshResponse = await apiClient.get(`/qualidade/quizzes/professor/${currentUser.id}`);
      setQuizzes(refreshResponse.data.data);
      
      // Optionally navigate to edit the new quiz
      if (response.data.newQuizId) {
        const shouldEdit = window.confirm('Deseja editar o novo quiz agora?');
        if (shouldEdit) {
          navigate(`/quizzes/editar/${response.data.newQuizId}`);
        }
      }
    } catch (error) {
      console.error('Erro ao duplicar quiz:', error);
      alert('Erro ao duplicar quiz.');
    }
  };

  const handleViewResults = (quizId) => {
    navigate(`/quizzes/resultados/${quizId}`);
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/quizzes/editar/${quizId}`);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm('Tem certeza que deseja apagar este quiz?')) {
      try {
        await apiClient.delete(`/qualidade/quizzes/${quizId}`);
        setQuizzes(quizzes.filter(q => q.id !== quizId));
        alert('Quiz apagado com sucesso!');
      } catch (err) {
        console.error('Erro ao apagar quiz:', err);
        alert('Não foi possível apagar o quiz.');
      }
    }
  };

  if (loading) {
    return <div className="p-6">A carregar quizzes...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-800 flex items-center">
        <BookOpen className="w-8 h-8 mr-2" /> Gestão de Quizzes
      </h1>

      <div className="flex justify-end mb-4">
        <button
          onClick={handleCreateQuiz}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 flex items-center"
        >
          <PlusCircle className="w-5 h-5 mr-2" /> Criar Novo Quiz
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
          <p className="mb-4">Não tens quizzes criados. Cria um novo quiz para começar!</p>
          <button
            onClick={handleCreateQuiz}
            className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
          >
            Criar Quiz Agora
          </button>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <ul className="divide-y divide-gray-200">
            {quizzes.map(quiz => (
              <li key={quiz.id} className="py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">{quiz.title}</h2>
                  <p className="text-sm text-gray-500">Disciplina: {quiz.discipline_name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">Criado em: {new Date(quiz.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleApplyQuiz(quiz.id, quiz.discipline_id)}
                    className="p-2 text-blue-600 hover:text-blue-800"
                    title="Aplicar Quiz"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleManageApplications(quiz)}
                    className="p-2 text-purple-600 hover:text-purple-800"
                    title="Gerir Aplicações"
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleViewResults(quiz.id)}
                    className="p-2 text-green-600 hover:text-green-800"
                    title="Ver Resultados"
                  >
                    <BarChart2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDuplicateQuiz(quiz)}
                    className="p-2 text-teal-600 hover:text-teal-800"
                    title="Duplicar Quiz"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEditQuiz(quiz.id)}
                    className="p-2 text-yellow-600 hover:text-yellow-800"
                    title="Editar Quiz"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                    title="Apagar Quiz"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showApplyQuizModal && (
        <ApplyQuizModal
          quizId={quizToApplyId}
          disciplineId={quizToApplyDisciplineId}
          onClose={handleCloseApplyQuizModal}
          onConfirm={handleConfirmApplyQuiz}
        />
      )}

      {showApplicationsModal && selectedQuizForApplications && (
        <QuizApplicationsModal
          quizId={selectedQuizForApplications.id}
          quizTitle={selectedQuizForApplications.title}
          onClose={handleCloseApplicationsModal}
        />
      )}

      {showDuplicateModal && quizToDuplicate && (
        <DuplicateQuizModal
          quiz={quizToDuplicate}
          user={currentUser}
          onClose={handleCloseDuplicateModal}
          onConfirm={handleConfirmDuplicate}
        />
      )}
    </div>
  );
};

export default QuizManagementPage;
