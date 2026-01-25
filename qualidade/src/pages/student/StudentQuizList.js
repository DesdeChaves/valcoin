import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStudentQuizApplications } from '../../services/api';
import { BookOpen } from 'lucide-react'; // For consistency with QuizManagementPage

const StudentQuizList = () => {
  const [quizApplications, setQuizApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizApplications = async () => {
      try {
        const data = await getStudentQuizApplications();
        setQuizApplications(data);
      } catch (err) {
        console.error('Erro ao carregar aplicações de quiz:', err);
        setError('Não foi possível carregar os quizzes.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizApplications();
  }, []);

  if (loading) {
    return <div className="p-6">A carregar quizzes...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-indigo-800 flex items-center">
        <BookOpen className="w-8 h-8 mr-2" /> Meus Quizzes
      </h1>
      
      <div className="space-y-4">
        {quizApplications.length === 0 ? (
          <p className="bg-white shadow rounded-lg p-6 text-center text-gray-600">Nenhum quiz disponível no momento.</p>
        ) : (
          quizApplications.map(app => (
            <div key={app.application_id} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-xl font-semibold">{app.quiz_title}</h2>
              <p className="text-sm text-gray-600">Disciplina: {app.discipline_name}</p>
              <p className="text-sm text-gray-600">Início: {new Date(app.start_time).toLocaleString()}</p>
              {app.end_time && <p className="text-sm text-gray-600">Fim: {new Date(app.end_time).toLocaleString()}</p>}
              
              <div className="mt-2 flex items-center space-x-2">
                {app.has_attempted ? (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-200 text-green-800">
                    Respondido {app.score !== null && `(${Number(app.score).toFixed(2)}%)`}
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-200 text-yellow-800">
                    Pendente
                  </span>
                )}
                {app.passed !== null && (
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    app.passed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {app.passed ? 'Aprovado' : 'Reprovado'}
                  </span>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                {!app.has_attempted && (new Date() < new Date(app.end_time || '9999-12-31T23:59:59')) ? (
                  <Link 
                    to={`/student/quiz/responder/${app.application_id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Responder Quiz
                  </Link>
                ) : (
                  <button 
                    className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
                    disabled
                  >
                    Ver Resultados
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentQuizList;