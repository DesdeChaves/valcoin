// memoria/client/src/components/Professor/ProfessorAnalyticsDashboad.js

import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Users, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'; // New imports

// Helper functions for student status display
const getStatusColor = (status) => {
  switch (status) {
    case 'excellent': return 'border-green-400 text-green-700 bg-green-50';
    case 'good': return 'border-blue-400 text-blue-700 bg-blue-50';
    case 'struggling': return 'border-orange-400 text-orange-700 bg-orange-50';
    case 'inactive': return 'border-gray-400 text-gray-700 bg-gray-50';
    default: return 'border-gray-400 text-gray-700 bg-gray-50';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'excellent': return '⭐';
    case 'good': return '👍';
    case 'struggling': return '⚠️';
    case 'inactive': return '💤';
    default: return '';
  }
};

const ProfessorAnalyticsDashboard = () => {
  console.log("ProfessorAnalyticsDashboard is rendering."); // Added for debugging
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await api.get('/disciplina_turma/professor/me');
        const myDisciplines = response.data.map(dt => ({
          id: dt.disciplina_id,
          name: dt.disciplina_nome || `Disciplina ${dt.disciplina_id}`
        }));
        setDisciplines(myDisciplines);
        if (myDisciplines.length > 0) {
          setSelectedDiscipline(myDisciplines[0].id);
        } else {
          setError('Não encontradas disciplinas associadas.');
        }
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as tuas disciplinas.');
      }
    };

    fetchDisciplines();
  }, []);

  useEffect(() => {
    if (selectedDiscipline) {
      const fetchAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await api.get(`/analytics/disciplina/${selectedDiscipline}`);
          setAnalyticsData(response.data.data);
          setLoading(false);
        } catch (err) {
          console.error('Erro ao carregar analíticas:', err);
          setError('Não foi possível carregar os dados de analíticas.');
          setLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [selectedDiscipline]);

  if (loading || disciplines.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">A carregar analíticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">Nenhum dado de analíticas disponível.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-blue-600 mb-4">
          📊 Analíticas de Flashcards
        </h1>
        <p className="text-xl text-gray-700">Visão geral do desempenho e criação dos teus flashcards</p>
      </header>

      {/* Discipline Selector */}
      {disciplines.length > 0 && (
        <div className="mb-10 flex flex-col sm:flex-row gap-6 items-center justify-center">
          <label className="text-lg font-semibold text-gray-800">Disciplina:</label>
          <select
            value={selectedDiscipline || ''}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-6 py-3 bg-white border-2 border-indigo-300 rounded-xl shadow-md focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition text-lg"
          >
            {disciplines.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

const ProfessorAnalyticsDashboard = () => {
  console.log("ProfessorAnalyticsDashboard is rendering."); // Added for debugging
  const [analyticsData, setAnalyticsData] = useState(null);
  const [studentAnalysis, setStudentAnalysis] = useState([]); // New state
  const [assuntoAnalysis, setAssuntoAnalysis] = useState([]); // New state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await api.get('/disciplina_turma/professor/me');
        const myDisciplines = response.data.map(dt => ({
          id: dt.disciplina_id,
          name: dt.disciplina_nome || `Disciplina ${dt.disciplina_id}`
        }));
        setDisciplines(myDisciplines);
        if (myDisciplines.length > 0) {
          setSelectedDiscipline(myDisciplines[0].id);
        } else {
          setError('Não encontradas disciplinas associadas.');
        }
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as tuas disciplinas.');
      }
    };

    fetchDisciplines();
  }, []);

  useEffect(() => {
    if (selectedDiscipline) {
      const fetchAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await api.get(`/analytics/disciplina/${selectedDiscipline}`);
          setAnalyticsData(response.data.data);
          setStudentAnalysis(response.data.data.studentAnalysis || []); // Map new data
          setAssuntoAnalysis(response.data.data.assuntoAnalysis || []); // Map new data
          setLoading(false);
        } catch (err) {
          console.error('Erro ao carregar analíticas:', err);
          setError('Não foi possível carregar os dados de analíticas.');
          setLoading(false);
        }
      };
      fetchAnalytics();
    }
  }, [selectedDiscipline]);

  if (loading || disciplines.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">A carregar analíticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">Nenhum dado de analíticas disponível.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-blue-600 mb-4">
          📊 Analíticas de Flashcards
        </h1>
        <p className="text-xl text-gray-700">Visão geral do desempenho e criação dos teus flashcards</p>
      </header>

      {/* Discipline Selector */}
      {disciplines.length > 0 && (
        <div className="mb-10 flex flex-col sm:flex-row gap-6 items-center justify-center">
          <label className="text-lg font-semibold text-gray-800">Disciplina:</label>
          <select
            value={selectedDiscipline || ''}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-6 py-3 bg-white border-2 border-indigo-300 rounded-xl shadow-md focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition text-lg"
          >
            {disciplines.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Total Flashcards */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-bold text-indigo-700">{analyticsData.totalFlashcards}</p>
          <p className="text-gray-600 mt-2">Total de Flashcards Criados</p>
        </div>

        {/* Total Reviews */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-bold text-blue-700">{analyticsData.totalReviews}</p>
          <p className="text-gray-600 mt-2">Total de Revisões Recebidas</p>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center text-center">
          <p className="text-5xl font-bold text-green-700">{analyticsData.averageRating.toFixed(1)}</p>
          <p className="text-gray-600 mt-2">Classificação Média</p>
        </div>

        {/* Rating Distribution */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Distribuição de Classificações</h3>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(analyticsData.ratingDistribution).map(([rating, count]) => (
              <div key={rating} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="capitalize text-gray-700">{rating}</span>
                <span className="font-bold text-lg text-indigo-600">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flashcards by Subject */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Flashcards por Assunto</h3>
          <ul>
            {analyticsData.flashcardsBySubject.map(item => (
              <li key={item.name} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="text-gray-700">{item.name}</span>
                <span className="font-bold text-lg text-indigo-600">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Reviews by Subject */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">Revisões por Assunto</h3>
          <ul>
            {analyticsData.reviewsBySubject.map(item => (
              <li key={item.name} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="text-gray-700">{item.name}</span>
                <span className="font-bold text-lg text-blue-600">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

        {/* Análise por Aluno */}
        {studentAnalysis.length > 0 ? (
          <div className="bg-white rounded-xl shadow-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600" />
              Desempenho Individual dos Alunos
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-100 to-purple-100">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Aluno</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Revisões</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Avaliação Média</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Dificuldade</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Estabilidade</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Falhas</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Tempo Médio</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentAnalysis.map((student, idx) => (
                    <tr 
                      key={student.id} 
                      className={`border-b border-gray-200 hover:bg-indigo-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.numero}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-indigo-600">{student.totalReviews}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${parseFloat(student.avgRating) >= 3.5 ? 'text-green-600' : parseFloat(student.avgRating) >= 2.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.avgRating}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-semibold">{student.avgDifficulty}</span>
                          {parseFloat(student.avgDifficulty) > 6 && <TrendingUp className="w-4 h-4 text-red-500" />}
                          {parseFloat(student.avgDifficulty) < 4 && <TrendingDown className="w-4 h-4 text-green-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-blue-600">{student.avgStability}d</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${student.totalLapses > 2 ? 'text-red-600' : 'text-gray-600'}`}>
                          {student.totalLapses}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700">{student.avgTimeSpent}s</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(student.status)}`}>
                          {getStatusIcon(student.status)}
                          {student.status === 'excellent' && 'Excelente'}
                          {student.status === 'good' && 'Bom'}
                          {student.status === 'struggling' && 'Dificuldade'}
                          {student.status === 'inactive' && 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-12 mb-8 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Nenhum aluno encontrado para esta seleção</p>
          </div>
        )}

        {/* Análise por Assunto */}
        {assuntoAnalysis.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Brain className="w-7 h-7 text-purple-600" />
              Dificuldade por Assunto
            </h2>
            
            <div className="space-y-4">
              {assuntoAnalysis.map(assunto => (
                <div key={assunto.id} className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 transition">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{assunto.name}</h3>
                    <span className="text-sm text-gray-500">{assunto.totalReviews} revisões</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Dificuldade Média</p>
                      <p className={`text-2xl font-bold ${parseFloat(assunto.avgDifficulty) > 6 ? 'text-red-600' : parseFloat(assunto.avgDifficulty) > 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {assunto.avgDifficulty}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Avaliação Média</p>
                      <p className="text-2xl font-bold text-blue-600">{assunto.avgRating}</p>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Alunos com Dificuldade</p>
                      <p className="text-2xl font-bold text-orange-600">{assunto.strugglingStudents}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Taxa de Sucesso</p>
                      <p className="text-2xl font-bold text-green-600">
                        {((parseFloat(assunto.avgRating) / 4) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                  
                  {assunto.strugglingStudents > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <p className="text-sm text-yellow-800">
                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                        <strong>{assunto.strugglingStudents}</strong> aluno(s) com dificuldade neste assunto - considere revisão adicional
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};    </div>
  );
};

export default ProfessorAnalyticsDashboard;