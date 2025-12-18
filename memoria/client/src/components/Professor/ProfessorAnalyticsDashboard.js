// src/components/Professor/ProfessorAnalyticsDashboard.js

import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Users, TrendingUp, TrendingDown, AlertTriangle, Brain, Clock, Target, BarChart3, Calendar, Award, Info } from 'lucide-react';

// Helper functions for student status display
const getStatusColor = (status) => {
  switch (status) {
    case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'struggling': return 'bg-red-100 text-red-800 border-red-300';
    case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'excellent': return <Award className="w-5 h-5" />;
    case 'good': return <TrendingUp className="w-5 h-5" />;
    case 'struggling': return <AlertTriangle className="w-5 h-5" />;
    case 'inactive': return <Clock className="w-5 h-5" />;
    default: return null;
  }
};

// Componente Tooltip
const Tooltip = ({ text, children, position = 'top' }) => {
  const [visible, setVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return '-top-2 left-1/2 transform -translate-x-1/2 -translate-y-full';
      case 'bottom':
        return 'top-8 left-1/2 transform -translate-x-1/2';
      case 'left':
        return 'top-1/2 right-8 transform -translate-y-1/2';
      case 'right':
        return 'top-1/2 left-8 transform -translate-y-1/2';
      default:
        return '-top-2 left-1/2 transform -translate-x-1/2 -translate-y-full';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'w-3 h-3 bg-gray-900 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2';
      case 'bottom':
        return 'w-3 h-3 bg-gray-900 transform rotate-45 -top-1 left-1/2 -translate-x-1/2';
      case 'left':
        return 'w-3 h-3 bg-gray-900 transform rotate-45 -right-1 top-1/2 -translate-y-1/2';
      case 'right':
        return 'w-3 h-3 bg-gray-900 transform rotate-45 -left-1 top-1/2 -translate-y-1/2';
      default:
        return 'w-3 h-3 bg-gray-900 transform rotate-45 -bottom-1 left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {visible && (
        <div className={`absolute z-50 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl ${getPositionClasses()}`}>
          <div className={`absolute ${getArrowClasses()}`}></div>
          {text}
        </div>
      )}
    </div>
  );
};

const ProfessorAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [studentAnalysis, setStudentAnalysis] = useState([]);
  const [assuntoAnalysis, setAssuntoAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState('');

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await api.get('/disciplina_turma/professor/me');
        const myDisciplines = response.data.data.map(dt => ({
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
          setStudentAnalysis(response.data.data.studentAnalysis || []);
          setAssuntoAnalysis(response.data.data.assuntoAnalysis || []);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-600">A carregar analíticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-800">{error}</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            📊 Análise de Desempenho dos Alunos
          </h1>
          <p className="text-gray-600 text-lg">Dashboard de acompanhamento e insights pedagógicos</p>
        </header>

        {/* Discipline Selector */}
        {disciplines.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <label className="text-lg font-semibold text-gray-800">Disciplina:</label>
              <select
                value={selectedDiscipline || ''}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="flex-1 max-w-md px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-lg font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                {disciplines.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* General Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total de Flashcards</h3>
              <BarChart3 className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-4xl font-bold text-indigo-900">{analyticsData.totalFlashcards || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Total de Revisões</h3>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-4xl font-bold text-blue-900">{analyticsData.totalReviews || 0}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-600 font-semibold">Avaliação Média</h3>
              <Award className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-4xl font-bold text-green-900">
              {analyticsData.averageRating ? analyticsData.averageRating.toFixed(1) : '0.0'}
            </p>
            <p className="text-sm text-gray-500 mt-1">de 4.0</p>
          </div>
        </div>

        {/* Rating Distribution & Flashcards by Subject */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {analyticsData.ratingDistribution && (
            <div className="bg-white rounded-xl shadow-lg p-6">
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
          )}

          {analyticsData.flashcardsBySubject && analyticsData.flashcardsBySubject.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">Flashcards por Assunto</h3>
              <ul className="space-y-2">
                {analyticsData.flashcardsBySubject.map(item => (
                  <li key={item.name} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-bold text-lg text-indigo-600">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Student Analysis Table */}
        {studentAnalysis && studentAnalysis.length > 0 ? (
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
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Revisões
                        <Tooltip text="Número total de vezes que o aluno reviu flashcards nesta disciplina" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Avaliação Média
                        <Tooltip text="Média das classificações dadas pelo aluno (1-Again, 2-Hard, 3-Good, 4-Easy). Valores mais altos indicam maior facilidade" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Dificuldade
                        <Tooltip text="Dificuldade percebida pelo algoritmo FSRS (0-10). Valores mais altos indicam maior dificuldade para memorizar o conteúdo" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Estabilidade
                        <Tooltip text="Tempo estimado (em dias) até o aluno esquecer o conteúdo. Valores mais altos indicam melhor retenção de memória" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Falhas
                        <Tooltip text="Número de vezes que o aluno classificou um flashcard como 'Again' (não se lembrou). Indica conceitos que precisam de reforço" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Tempo Médio
                        <Tooltip text="Tempo médio (em segundos) que o aluno leva para responder a cada flashcard" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Status
                        <Tooltip text="Classificação geral: Excelente (ótimo desempenho), Bom (desempenho satisfatório), Dificuldade (precisa de apoio), Inativo (sem revisões)" position="bottom">
                          <Info className="w-4 h-4 text-gray-500" />
                        </Tooltip>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentAnalysis.map((student, idx) => (
                    <tr 
                      key={student.id || idx} 
                      className={`border-b border-gray-200 hover:bg-indigo-50 transition ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-500">{student.numero}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-indigo-600">{student.totalReviews || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${parseFloat(student.avgRating) >= 3.5 ? 'text-green-600' : parseFloat(student.avgRating) >= 2.5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {student.avgRating || '0.0'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-semibold">{student.avgDifficulty || '0.0'}</span>
                          {parseFloat(student.avgDifficulty) > 6 && <TrendingUp className="w-4 h-4 text-red-500" />}
                          {parseFloat(student.avgDifficulty) < 4 && <TrendingDown className="w-4 h-4 text-green-500" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-blue-600">{student.avgStability || '0.0'}d</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-bold ${student.totalLapses > 2 ? 'text-red-600' : 'text-gray-600'}`}>
                          {student.totalLapses || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700">{student.avgTimeSpent || 0}s</span>
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
            <p className="text-xl text-gray-600">Nenhum dado de alunos disponível</p>
          </div>
        )}

        {/* Subject Analysis */}
        {assuntoAnalysis && assuntoAnalysis.length > 0 && (
          <div className="bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Brain className="w-7 h-7 text-purple-600" />
              Dificuldade por Assunto
            </h2>
            
            <div className="space-y-4">
              {assuntoAnalysis.map((assunto, idx) => (
                <div key={assunto.id || idx} className="border-2 border-gray-200 rounded-lg p-5 hover:border-purple-300 transition">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-800">{assunto.name}</h3>
                    <span className="text-sm text-gray-500">{assunto.totalReviews || 0} revisões</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-600">Dificuldade Média</p>
                        <Tooltip text="Dificuldade média percebida pelo algoritmo (0-10). >6 é difícil, 4-6 é médio, <4 é fácil">
                          <Info className="w-3 h-3 text-gray-500" />
                        </Tooltip>
                      </div>
                      <p className={`text-2xl font-bold ${parseFloat(assunto.avgDifficulty) > 6 ? 'text-red-600' : parseFloat(assunto.avgDifficulty) > 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {assunto.avgDifficulty || '0.0'}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-600">Avaliação Média</p>
                        <Tooltip text="Classificação média dada pelos alunos (1-4). 4=Easy, 3=Good, 2=Hard, 1=Again">
                          <Info className="w-3 h-3 text-gray-500" />
                        </Tooltip>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">{assunto.avgRating || '0.0'}</p>
                    </div>
                    
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-600">Alunos com Dificuldade</p>
                        <Tooltip text="Número de alunos que classificaram flashcards deste assunto como 'Again' (falha na memorização)">
                          <Info className="w-3 h-3 text-gray-500" />
                        </Tooltip>
                      </div>
                      <p className="text-2xl font-bold text-orange-600">{assunto.strugglingStudents || 0}</p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-600">Taxa de Sucesso</p>
                        <Tooltip text="Percentagem calculada com base na avaliação média (avaliação/4 × 100). Indica o sucesso geral no assunto">
                          <Info className="w-3 h-3 text-gray-500" />
                        </Tooltip>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {assunto.avgRating ? ((parseFloat(assunto.avgRating) / 4) * 100).toFixed(0) : 0}%
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
};

export default ProfessorAnalyticsDashboard;
