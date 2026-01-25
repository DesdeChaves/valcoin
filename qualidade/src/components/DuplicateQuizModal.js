import React, { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
import { getProfessorDisciplinaTurma } from '../services/api';


const DuplicateQuizModal = ({ quiz, user: currentUser, onClose, onConfirm }) => {
  const [newTitle, setNewTitle] = useState(`${quiz.title} (Cópia)`);
  const [selectedDiscipline, setSelectedDiscipline] = useState(quiz.discipline_id);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        setLoading(true);
        if (!currentUser) {
          setError('Utilizador não autenticado.');
          setLoading(false);
          return;
        }
        const response = await getProfessorDisciplinaTurma(currentUser.id);
        const myDisciplines = response.map(dt => ({
          id: dt.disciplina_id,
          name: dt.disciplina_nome || `Disciplina ${dt.disciplina_id}`,
        }));
        setDisciplines(myDisciplines);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as disciplinas.');
        setLoading(false);
      }
    };

    fetchDisciplines();
  }, [currentUser]);

  const handleSubmit = () => {
    if (!newTitle.trim()) {
      alert('Por favor, defina um título para o novo quiz.');
      return;
    }

    if (!selectedDiscipline) {
      alert('Por favor, selecione uma disciplina.');
      return;
    }

    onConfirm({
      originalQuizId: quiz.id,
      newTitle: newTitle.trim(),
      newDisciplineId: selectedDiscipline,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center">
            <Copy className="w-6 h-6 mr-2 text-indigo-600" />
            Duplicar Quiz
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <p className="text-center py-4">A carregar...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-4">Erro: {error}</p>
        ) : (
          <div>
            {/* Original Quiz Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-1">Quiz Original:</p>
              <p className="font-semibold text-gray-800">{quiz.title}</p>
              <p className="text-sm text-gray-500">
                Disciplina: {quiz.discipline_name}
              </p>
            </div>

            {/* New Title */}
            <div className="mb-4">
              <label htmlFor="new-title" className="block text-gray-700 text-sm font-bold mb-2">
                Título do Novo Quiz:
              </label>
              <input
                type="text"
                id="new-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Ex: Quiz de Revisão - Módulo 2"
              />
            </div>

            {/* Discipline Selection */}
            <div className="mb-6">
              <label htmlFor="discipline-select" className="block text-gray-700 text-sm font-bold mb-2">
                Disciplina:
              </label>
              <select
                id="discipline-select"
                value={selectedDiscipline}
                onChange={(e) => setSelectedDiscipline(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                {disciplines.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pode duplicar para a mesma disciplina ou para outra
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Todas as perguntas do quiz original serão copiadas. 
                Poderá editá-las após a criação.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicar Quiz
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateQuizModal;
