import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, Calendar, Users, Clock } from 'lucide-react';
import { getQuizApplicationsByQuizId, updateQuizApplication, deleteQuizApplication } from '../services/api';

const QuizApplicationsModal = ({ quizId, quizTitle, onClose }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingApp, setEditingApp] = useState(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [quizId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await getQuizApplicationsByQuizId(quizId);
      setApplications(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar aplicações:', err);
      setError('Não foi possível carregar as aplicações do quiz.');
      setLoading(false);
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    if (!window.confirm('Tem certeza que deseja apagar esta aplicação? Os resultados dos alunos também serão removidos.')) {
      return;
    }

    try {
      await deleteQuizApplication(applicationId);
      setApplications(applications.filter(app => app.application_id !== applicationId));
      alert('Aplicação apagada com sucesso!');
    } catch (err) {
      console.error('Erro ao apagar aplicação:', err);
      alert('Não foi possível apagar a aplicação.');
    }
  };

  const handleStartEdit = (application) => {
    setEditingApp(application.application_id);
    // Convert UTC timestamps to local datetime-local format
    setEditStartTime(formatDateForInput(application.start_time));
    setEditEndTime(application.end_time ? formatDateForInput(application.end_time) : '');
  };

  const handleCancelEdit = () => {
    setEditingApp(null);
    setEditStartTime('');
    setEditEndTime('');
  };

  const handleSaveEdit = async (applicationId) => {
    if (!editStartTime) {
      alert('Por favor, defina a data/hora de início.');
      return;
    }

    try {
      await updateQuizApplication(applicationId, {
        startTime: editStartTime,
        endTime: editEndTime || null,
      });
      
      // Update local state
      setApplications(applications.map(app => 
        app.application_id === applicationId 
          ? { ...app, start_time: editStartTime, end_time: editEndTime || null }
          : app
      ));
      
      alert('Aplicação atualizada com sucesso!');
      handleCancelEdit();
    } catch (err) {
      console.error('Erro ao atualizar aplicação:', err);
      alert('Não foi possível atualizar a aplicação.');
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format: YYYY-MM-DDTHH:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return 'Sem limite';
    return new Date(dateString).toLocaleString('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            Aplicações do Quiz: {quizTitle}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <p className="text-center py-8">A carregar aplicações...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-8">Erro: {error}</p>
        ) : applications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Este quiz ainda não foi aplicado a nenhuma turma.
          </p>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <div 
                key={app.application_id} 
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {editingApp === app.application_id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Users className="w-4 h-4" />
                      <span className="font-semibold">{app.turma_nome}</span>
                      <span className="text-gray-400">•</span>
                      <span>{app.discipline_name}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data/Hora de Início *
                        </label>
                        <input
                          type="datetime-local"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data/Hora de Fim (Opcional)
                        </label>
                        <input
                          type="datetime-local"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSaveEdit(app.application_id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-lg font-semibold text-gray-800">
                          {app.turma_nome}
                        </h4>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 ml-7">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Disciplina:</span>
                          {app.discipline_name}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">Início:</span>
                          {formatDateForDisplay(app.start_time)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Fim:</span>
                          {formatDateForDisplay(app.end_time)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleStartEdit(app)}
                        className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded"
                        title="Editar aplicação"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteApplication(app.application_id)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Apagar aplicação"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizApplicationsModal;
