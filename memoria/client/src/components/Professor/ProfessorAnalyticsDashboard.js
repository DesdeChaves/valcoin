// memoria/client/src/components/Professor/ProfessorAnalyticsDashboad.js

import React, { useState, useEffect } from 'react';
import api from '../../api';

const ProfessorAnalyticsDashboard = () => {
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
    </div>
  );
};

export default ProfessorAnalyticsDashboard;