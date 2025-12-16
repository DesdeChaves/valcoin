import React, { useState, useEffect } from 'react';
import api from '../../api';
import { format } from 'date-fns';
import EditFlashcardModal from './EditFlashcardModal';

const ManageFlashcardsPage = () => {
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingFlashcard, setEditingFlashcard] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);


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
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
        setError('Não foi possível carregar as tuas disciplinas.');
        setLoading(false);
      }
    };

    fetchDisciplines();
  }, []);

  useEffect(() => {
    if (selectedDiscipline) {
      fetchFlashcards();
    }
  }, [selectedDiscipline]);

  const fetchFlashcards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/flashcards', {
        params: { discipline_id: selectedDiscipline }
      });
      setFlashcards(response.data.data);
    } catch (err) {
      setError('Erro ao carregar flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFlashcard = async (id) => {
    if (!window.confirm('Tens a certeza que queres eliminar este flashcard?')) return;

    try {
      await api.delete(`/flashcards/${id}`);
      setFlashcards(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Erro ao eliminar o flashcard.');
    }
  };

  const handleOpenEditModal = (card) => {
    setEditingFlashcard(card);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditingFlashcard(null);
    setIsEditModalOpen(false);
  };

  const handleSaveFlashcard = async (updatedCard) => {
    try {
        await api.put(`/flashcards/${updatedCard.id}`, updatedCard);
        fetchFlashcards(); // Re-fetch to get the updated list
        handleCloseEditModal();
    } catch (err) {
        alert('Erro ao guardar as alterações.');
    }
  };

  const renderFlashcardPreview = (card) => {
    if (card.type === 'basic') {
        return (
          <div className="space-y-2">
            <div className="font-medium text-gray-700">Frente:</div>
            <div className="p-3 bg-gray-50 rounded-lg">{card.front}</div>
            <div className="font-medium text-gray-700 mt-3">Verso:</div>
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-800">{card.back}</div>
          </div>
        );
      }
  
      if (card.type === 'cloze') {
        return (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <div dangerouslySetInnerHTML={{ __html: card.cloze_text.replace(/{{c\d+::(.*?)}}/g, '<strong class="text-purple-800">___ ($1)</strong>') }} />
          </div>
        );
      }
  
      if (card.type === 'image_occlusion') {
        return (
          <div className="text-center">
            <img src={card.image_url} alt="Imagem" className="max-w-full h-48 object-cover rounded-lg shadow-md" />
            <p className="mt-3 text-sm text-gray-600">
              {card.occlusion_data?.length || 0} regiões ocultas
            </p>
          </div>
        );
      }
  
      return <p>Tipo desconhecido</p>;
  };
  
  if (loading && disciplines.length === 0) {
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
            🧠 Memória — Gerir Flashcards
          </h1>
          <p className="text-xl text-gray-700">Gere os teus flashcards</p>
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

        <h2 className="text-3xl font-bold text-indigo-800 mb-8 text-center">
            Flashcards Criados ({flashcards.length})
        </h2>

        {loading ? (
            <p className="text-center text-gray-600">A carregar flashcards...</p>
        ) : flashcards.length === 0 ? (
            <p className="text-center text-gray-600 text-xl">
            Ainda não criaste flashcards para esta disciplina.
            </p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {flashcards.map(card => (
                <div
                key={card.id}
                className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg p-6 border border-indigo-200 hover:shadow-2xl transition"
                >
                <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium capitalize">
                    {card.type.replace('_', ' ')}
                    </span>
                    <div>
                        <button
                            onClick={() => handleOpenEditModal(card)}
                            className="text-blue-500 hover:text-blue-700 font-bold text-xl mr-2"
                            title="Editar"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={() => handleDeleteFlashcard(card.id)}
                            className="text-red-500 hover:text-red-700 font-bold text-xl"
                            title="Eliminar"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="mb-4">
                    {renderFlashcardPreview(card)}
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                    {card.assunto_name && <p><strong>Assunto:</strong> {card.assunto_name}</p>}
                    <p><strong>Data:</strong> {format(new Date(card.scheduled_date), 'dd/MM/yyyy')}</p>
                    <p><strong>Criado:</strong> {format(new Date(card.created_at), 'dd/MM/yyyy')}</p>
                    {card.hints?.length > 0 && <p><strong>Dicas:</strong> {card.hints.length}</p>}
                </div>
                </div>
            ))}
            </div>
        )}
        
        {isEditModalOpen && (
            <EditFlashcardModal
                flashcard={editingFlashcard}
                onClose={handleCloseEditModal}
                onSave={handleSaveFlashcard}
            />
        )}
    </div>
  );
};

export default ManageFlashcardsPage;
