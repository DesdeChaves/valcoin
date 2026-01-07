import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, Headphones } from 'lucide-react';
import api from '../../api';
import { PhoneticFlashcard, DictationFlashcard, AudioQuestionFlashcard, ReadingFlashcard, SpellingFlashcard } from './audio_flashcards_page';

const AudioStudentPage = () => {
  const [deck, setDeck] = useState([]);
  const [fullDeck, setFullDeck] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [disciplines, setDisciplines] = useState([]);

  useEffect(() => {
    const loadDailyDeck = async () => {
      try {
        const response = await api.get('/audio-flashcards/queue');
        const cards = response.data.data.cards || [];
        setFullDeck(cards);
        setDeck(cards);
        const uniqueDisciplines = [...new Set(cards.map(card => card.discipline_name))];
        setDisciplines(uniqueDisciplines);
        if (cards.length > 0) {
          setCurrentCard(cards[0]);
        }
      } catch (err) {
        console.error('Error loading audio deck:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDailyDeck();
  }, []);

  useEffect(() => {
    const filtered = disciplineFilter === 'all'
      ? fullDeck
      : fullDeck.filter(card => card.discipline_name === disciplineFilter);
    
    setDeck(filtered);
    setCurrentCard(filtered[0] || null);
  }, [disciplineFilter, fullDeck]);

  const handleComplete = (result) => {
    // Encontra o índice do card atual
    const currentIndex = deck.findIndex(card => card.id === currentCard.id);
    
    // Remove o card atual e pega os restantes
    const remaining = deck.filter((card, index) => index !== currentIndex);
    
    setDeck(remaining);
    
    // Define o próximo card (primeiro da lista restante)
    const next = remaining.length > 0 ? remaining[0] : null;
    setCurrentCard(next);
  };

  const renderCard = () => {
    if (!currentCard) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 shadow-lg">
          <div className="bg-green-100 rounded-full p-6 mb-6">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Parabéns!</h2>
          <p className="text-lg text-gray-600 text-center max-w-md">
            Terminaste a tua sessão de áudio por hoje. Excelente trabalho!
          </p>
        </div>
      );
    }

    const cardComponents = {
      phonetic: PhoneticFlashcard,
      dictation: DictationFlashcard,
      audio_question: AudioQuestionFlashcard,
      reading: ReadingFlashcard,
      spelling: SpellingFlashcard
    };

    const CardComponent = cardComponents[currentCard.type];
    
    if (!CardComponent) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">Tipo de flashcard de áudio desconhecido.</p>
        </div>
      );
    }

    return <CardComponent flashcard={currentCard} onComplete={handleComplete} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-gray-600 font-medium">A carregar sessão de áudio...</p>
        </div>
      </div>
    );
  }

  const progress = deck.length > 0 ? ((deck.length - deck.indexOf(currentCard)) / deck.length) * 100 : 100;
  const cardsRemaining = deck.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 rounded-full p-3">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Sessão de Áudio</h1>
              <p className="text-sm text-gray-600">
                {cardsRemaining > 0 ? `${cardsRemaining} flashcard${cardsRemaining !== 1 ? 's' : ''} restante${cardsRemaining !== 1 ? 's' : ''}` : 'Sessão completa'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {cardsRemaining > 0 && (
            <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${100 - progress}%` }}
              />
            </div>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="discipline-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filtrar por Disciplina
          </label>
          <select
            id="discipline-filter"
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Todas as Disciplinas</option>
            {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Card Container */}
        <div className="animate-fade-in">
          {renderCard()}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AudioStudentPage;
