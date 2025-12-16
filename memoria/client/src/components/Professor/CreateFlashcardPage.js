import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import FlashCardCreator from './FlashCardCreator.js';

const CreateFlashcardPage = () => {
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
        }
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as tuas disciplinas.');
      } finally {
        setLoading(false);
      }
    };

    fetchDisciplines();
  }, []);

  const handleFlashcardCreated = () => {
    navigate('/manage');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-xl text-gray-600">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-10">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            🧠 Memória — Criar Flashcard
          </h1>
          <p className="text-xl text-gray-700">Cria flashcards com repetição espaçada avançada</p>
        </header>
    
        {error && (
          <div className="mb-8 p-5 bg-red-100 border border-red-400 text-red-800 rounded-xl text-center">
            {error}
          </div>
        )}

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

      {selectedDiscipline && (
        <FlashCardCreator
          disciplineId={selectedDiscipline}
          onSuccess={handleFlashcardCreated}
        />
      )}
    </div>
  );
};

export default CreateFlashcardPage;
