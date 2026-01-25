import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAppliedQuizzes } from '../../utils/api';
import { ClipboardList, Book, Users, Calendar, ChevronRight, Filter } from 'lucide-react';

const QuizEvaluationPage = () => {
  const [appliedQuizzes, setAppliedQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        const response = await getAppliedQuizzes();
        setAppliedQuizzes(response.data);
      } catch (err) {
        setError('Não foi possível carregar os quizzes aplicados.');
        console.error('Error fetching applied quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const disciplines = useMemo(() => {
    const allDisciplines = appliedQuizzes.map(app => ({ id: app.discipline_id, name: app.discipline_name }));
    return [...new Map(allDisciplines.map(item => [item['id'], item])).values()];
  }, [appliedQuizzes]);

  const filteredQuizzes = useMemo(() => {
    if (!selectedDiscipline) {
      return appliedQuizzes;
    }
    return appliedQuizzes.filter(app => app.discipline_id === selectedDiscipline);
  }, [appliedQuizzes, selectedDiscipline]);

  if (loading) {
    return <div className="p-6">A carregar quizzes...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <ClipboardList className="w-8 h-8 mr-3 text-indigo-600" />
          Avaliação de Quizzes
        </h1>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <label htmlFor="discipline-filter" className="text-sm font-medium text-gray-700">Filtrar por Disciplina:</label>
          <select
            id="discipline-filter"
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Todas as Disciplinas</option>
            {disciplines.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">Nenhum quiz aplicado corresponde ao filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuizzes.map((app) => (
            <div key={app.application_id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div className="flex-grow">
                  <h2 className="text-xl font-semibold text-indigo-700">{app.quiz_title}</h2>
                  <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
                    <span className="flex items-center"><Book className="w-4 h-4 mr-1.5" />{app.discipline_name}</span>
                    <span className="flex items-center"><Users className="w-4 h-4 mr-1.5" />{app.turma_nome}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" />
                      {new Date(app.start_time).toLocaleString()} - {app.end_time ? new Date(app.end_time).toLocaleString() : 'Sem data final'}
                    </span>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <button 
                    onClick={() => navigate(`/quizzes/avaliacao/${app.application_id}`)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 flex items-center"
                  >
                    Ver Notas <ChevronRight className="w-5 h-5 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizEvaluationPage;
