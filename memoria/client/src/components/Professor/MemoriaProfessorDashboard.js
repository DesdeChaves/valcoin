// src/components/Professor/MemoriaProfessorDashboard.js

import React, { useState, useEffect } from 'react';
import api from '../../api';
import MyFlashCardCreator from './FlashCardCreator.js';
import { format } from 'date-fns';

const MemoriaProfessorDashboard = () => {
  const [disciplines, setDisciplines] = useState([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [activeTab, setActiveTab] = useState('create'); // 'create' ou 'manage'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Carregar disciplinas do professor
  useEffect(() => {
    const fetchDisciplines = async () => {
      try {
        // Esta rota precisa existir no teu backend principal ou criar uma específica
        // Assumindo que tens /api/disciplina_turma/professor/me ou similar
        const response = await api.get('/disciplina_turma/professor/me'); // ajustar se necessário
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

  // Carregar flashcards quando muda a disciplina ou tab
  useEffect(() => {
    if (activeTab === 'manage' && selectedDiscipline) {
      fetchFlashcards();
    }
  }, [activeTab, selectedDiscipline]);

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

  const handleFlashcardCreated = () => {
    setActiveTab('manage');
    fetchFlashcards();
  };

  const handleDeleteFlashcard = async (id) => {
    if (!window.confirm('Tens a certeza que queres eliminar este flashcard?')) return;

    try {
      // Futura rota: await api.delete(`/flashcards/${id}`);
      // Por agora, apenas remove da UI (soft delete no backend futuro)
      setFlashcards(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Erro ao eliminar (funcionalidade futura)');
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">A carregar painel do professor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-6">

        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            🧠 Memória — Painel do Professor
          </h1>
          <p className="text-xl text-gray-700">Cria e gere flashcards com repetição espaçada avançada</p>
        </header>

        {error && (
          <div className="mb-8 p-5 bg-red-100 border border-red-400 text-red-800 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Seletor de Disciplina */}
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

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-xl shadow-lg p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-8 py-4 rounded-lg font-semibold transition ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              ➕ Criar Flashcard
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-8 py-4 rounded-lg font-semibold transition ${
                activeTab === 'manage'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📋 Gerir Flashcards ({flashcards.length})
            </button>
          </div>
        </div>

        {/* Conteúdo das Tabs */}
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {activeTab === 'create' && selectedDiscipline && (
            <MyFlashCardCreator
              disciplineId={selectedDiscipline}
              onSuccess={handleFlashcardCreated}
            />
          )}

          {activeTab === 'manage' && (
            <>
              <h2 className="text-3xl font-bold text-indigo-800 mb-8 text-center">
                Flashcards Criados ({flashcards.length})
              </h2>

              {loading ? (
                <p className="text-center text-gray-600">A carregar flashcards...</p>
              ) : flashcards.length === 0 ? (
                <p className="text-center text-gray-600 text-xl">
                  Ainda não criaste flashcards para esta disciplina.<br />
                  Vai à tab "Criar Flashcard" para começar!
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
                        <button
                          onClick={() => handleDeleteFlashcard(card.id)}
                          className="text-red-500 hover:text-red-700 font-bold text-xl"
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </div>

                      <div className="mb-4">
                        {renderFlashcardPreview(card)}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Data:</strong> {format(new Date(card.scheduled_date), 'dd/MM/yyyy')}</p>
                        <p><strong>Criado:</strong> {format(new Date(card.created_at), 'dd/MM/yyyy')}</p>
                        {card.hints?.length > 0 && <p><strong>Dicas:</strong> {card.hints.length}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default MemoriaProfessorDashboard;
