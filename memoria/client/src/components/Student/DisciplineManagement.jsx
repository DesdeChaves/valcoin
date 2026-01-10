import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { BookOpen, CheckCircle, PlusCircle, MinusCircle, Loader2 } from 'lucide-react';
import {
  getAvailableDisciplines,
  subscribeToDiscipline,
  getMySubscribedDisciplines,
  MAX_EXTERNAL_DISCIPLINES
} from '../../services/memoria.api'; // Assuming memoria.api will be created/updated

const DisciplineManagement = ({ currentUser }) => {
  const [availableDisciplines, setAvailableDisciplines] = useState([]);
  const [subscribedDisciplines, setSubscribedDisciplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null); // Stores discipline ID being processed
  const [error, setError] = useState(null);

  const fetchDisciplines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await getAvailableDisciplines();
      const subscribed = await getMySubscribedDisciplines();
      
      setAvailableDisciplines(available.data || []);
      setSubscribedDisciplines(subscribed.data || []);
    } catch (err) {
      console.error('Error fetching disciplines:', err);
      setError('Erro ao carregar as disciplinas.');
      toast.error('Erro ao carregar as disciplinas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisciplines();
  }, [fetchDisciplines]);

  const handleSubscribe = async (disciplineId) => {
    setSubmitting(disciplineId);
    try {
      await subscribeToDiscipline(disciplineId);
      toast.success('Inscrição realizada com sucesso!');
      fetchDisciplines(); // Refresh lists
    } catch (err) {
      console.error('Error subscribing:', err);
      toast.error(err.response?.data?.message || 'Erro ao subscrever à disciplina.');
    } finally {
      setSubmitting(null);
    }
  };

  const isSubscribed = (disciplineId) => subscribedDisciplines.some(d => d.id === disciplineId);
  const canSubscribe = currentUser.tipo_utilizador !== 'EXTERNO' || subscribedDisciplines.length < MAX_EXTERNAL_DISCIPLINES;


  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
        <span className="ml-2 text-indigo-700">A carregar disciplinas...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Gerir Disciplinas de Flashcards</h2>

      {currentUser.tipo_utilizador === 'EXTERNO' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                Como utilizador externo, pode subscrever a um máximo de {MAX_EXTERNAL_DISCIPLINES} disciplinas.
                Atualmente inscrito em {subscribedDisciplines.length}/{MAX_EXTERNAL_DISCIPLINES}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Minhas Disciplinas */}
        <div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2 text-green-600" />
            Minhas Disciplinas
          </h3>
          {subscribedDisciplines.length === 0 ? (
            <p className="text-gray-600">Não está inscrito em nenhuma disciplina.</p>
          ) : (
            <ul className="space-y-3">
              {subscribedDisciplines.map(discipline => (
                <li key={discipline.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200">
                  <span className="font-medium text-gray-800">{discipline.nome}</span>
                  {/* For now, no unsubscribe. If needed, add similar logic to subscribe */}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Disciplinas Disponíveis */}
        <div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-4 flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
            Disciplinas Disponíveis
          </h3>
          {availableDisciplines.length === 0 ? (
            <p className="text-gray-600">Nenhuma disciplina disponível para inscrição.</p>
          ) : (
            <ul className="space-y-3">
              {availableDisciplines.map(discipline => (
                <li key={discipline.id} className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-200">
                  <span className="font-medium text-gray-800">{discipline.nome}</span>
                  {isSubscribed(discipline.id) ? (
                    <span className="text-green-600 flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" /> Inscrito
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(discipline.id)}
                      disabled={!canSubscribe || submitting === discipline.id}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        canSubscribe
                          ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {submitting === discipline.id ? (
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      ) : (
                        <PlusCircle className="h-5 w-5 mr-2" />
                      )}
                      Subscrever
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisciplineManagement;
