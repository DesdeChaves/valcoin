import React, { useState, useEffect } from 'react';
import apiClient from '../services/api'; // Assuming you have an api service
import useAuth from '../hooks/useAuth';
import { X } from 'lucide-react';

const ApplyQuizModal = ({ quizId, disciplineId, onClose, onConfirm }) => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [errorClasses, setErrorClasses] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      if (authLoading) return;

      if (!currentUser?.id || !disciplineId) {
        setErrorClasses('Missing user ID or discipline ID.');
        setLoadingClasses(false);
        return;
      }

      try {
        setLoadingClasses(true);
        // This endpoint needs to be created in the backend
        const response = await apiClient.get(`/qualidade/quizzes/turmas/professor/${currentUser.id}/disciplina/${disciplineId}`);
        setClasses(response.data.data); // Expecting [{ id, name, year }]
        setLoadingClasses(false);
      } catch (err)
      {
        console.error('Erro ao carregar turmas:', err);
        setErrorClasses('NÃ£o foi possÃ­vel carregar as turmas para esta disciplina.');
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [currentUser?.id, disciplineId, authLoading]);

  const handleClassSelect = (classId) => {
    setSelectedClassIds(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedClassIds.length === 0) {
      alert('Por favor, selecione pelo menos uma turma.');
      return;
    }
    if (!startTime) {
      alert('Por favor, defina a data/hora de inÃ­cio.');
      return;
    }

    onConfirm(quizId, selectedClassIds, startTime, endTime);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900">Aplicar Quiz</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {loadingClasses ? (
          <p>A carregar turmas...</p>
        ) : errorClasses ? (
          <p className="text-red-500">Erro: {errorClasses}</p>
        ) : classes.length === 0 ? (
          <p>NÃ£o foram encontradas turmas para esta disciplina.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Selecionar Turmas:
              </label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {classes.map(turma => (
                  <div key={turma.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`turma-${turma.id}`}
                      checked={selectedClassIds.includes(turma.id)}
                      onChange={() => handleClassSelect(turma.id)}
                      className="form-checkbox h-5 w-5 text-indigo-600"
                    />
                    <label htmlFor={`turma-${turma.id}`} className="ml-2 text-gray-700">
                      {turma.name} ({turma.year})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="start-time" className="block text-gray-700 text-sm font-bold mb-2">
                Data/Hora de InÃ­cio:
              </label>
              <input
                type="datetime-local"
                id="start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="end-time" className="block text-gray-700 text-sm font-bold mb-2">
                Data/Hora de Fim (Opcional):
              </label>
              <input
                type="datetime-local"
                id="end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded mr-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
              >
                Aplicar Quiz
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ApplyQuizModal;
