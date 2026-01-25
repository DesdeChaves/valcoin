import React, { useState, useEffect } from 'react';
import api from '../../api';
import FlashCardCreator from './FlashCardCreator.js';

const CreateFlashcardPage = () => {
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIdioma, setSelectedIdioma] = useState('pt');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        const response = await api.get('/disciplina_turma/professor/me');
        console.log(response);
        const flattenedDisciplines = response.data.data.flatMap(d => 
          d.turmas.map(t => ({
            disciplina_turma_id: t.disciplina_turma_id,
            disciplina_id: d.disciplina_id,
            name: `${d.disciplina_nome} (${t.turma_nome})`
          }))
        );
        setDisciplines(flattenedDisciplines);
        if (flattenedDisciplines.length > 0) {
          setSelectedDiscipline(flattenedDisciplines[0]);
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
    // Mostra mensagem de sucesso
    setSuccessMessage('✓ Flashcard criado com sucesso!');
    
    // Remove a mensagem após 3 segundos
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
    
    // Não navega para outra página - permanece aqui
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

      {successMessage && (
        <div className="mb-8 p-5 bg-green-100 border border-green-400 text-green-800 rounded-xl text-center font-semibold animate-pulse">
          {successMessage}
        </div>
      )}

      {disciplines.length > 0 && (
        <div className="mb-10 flex flex-col sm:flex-row gap-6 items-center justify-center">
          <label className="text-lg font-semibold text-gray-800">Disciplina:</label>
          <select
            value={selectedDiscipline ? selectedDiscipline.disciplina_turma_id : ''}
            onChange={(e) => {
              const selected = disciplines.find(d => d.disciplina_turma_id === e.target.value);
              setSelectedDiscipline(selected);
            }}
            className="px-6 py-3 bg-white border-2 border-indigo-300 rounded-xl shadow-md focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition text-lg"
          >
            {disciplines.map(d => (
              <option key={d.disciplina_turma_id} value={d.disciplina_turma_id}>
                {d.name}
              </option>
            ))}
          </select>
          
          <label className="text-lg font-semibold text-gray-800">Idioma:</label>
          <select
            value={selectedIdioma}
            onChange={(e) => setSelectedIdioma(e.target.value)}
            className="px-6 py-3 bg-white border-2 border-indigo-300 rounded-xl shadow-md focus:border-indigo-600 focus:ring-4 focus:ring-indigo-200 transition text-lg"
          >
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
            <option value="es">Espanhol</option>
            <option value="fr">Francês</option>
          </select>
        </div>
      )}

      {selectedDiscipline && (
        <FlashCardCreator
          disciplineId={selectedDiscipline.disciplina_id}
          selectedIdioma={selectedIdioma}
          onSuccess={handleFlashcardCreated}
        />
      )}
    </div>
  );
};

export default CreateFlashcardPage;
