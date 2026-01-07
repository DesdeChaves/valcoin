import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';
import { Brain, CheckCircle, XCircle, AlertCircle, Lightbulb, Clock, Target } from 'lucide-react';
import AudioStudentPage from './AudioStudentPage';

const MemoriaStudentPage = () => {
  const [deck, setDeck] = useState([]);
  const [fullDeck, setFullDeck] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, reviewed: 0 });
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [minReflectionTime] = useState(2);
  const [totalTime, setTotalTime] = useState(0);
  const [view, setView] = useState('classic');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [filteredDeck, setFilteredDeck] = useState([]);
  const [disciplines, setDisciplines] = useState([]);

  const canvasRef = useRef(null);
  const cardStartTimeRef = useRef(null);

  // ====== FUNÇÕES ======

  const drawImageOcclusion = useCallback((cardToDraw) => {
    const canvas = canvasRef.current;
    if (!canvas || !cardToDraw?.image_url) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (!isFlipped && cardToDraw.sub_data?.coords) {
        const [x, y, width, height] = cardToDraw.sub_data.coords;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x, y + height - 50, width, 50);
        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + width / 2, y + height - 25);
      }
    };

    img.onerror = () => {
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#991b1b';
      ctx.font = '30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Imagem não carregada', canvas.width / 2, canvas.height / 2);
    };

    img.src = cardToDraw.image_url;
  }, [isFlipped]);

  const handleRating = useCallback(async (rating) => {
    if (!currentCard || !cardStartTimeRef.current) return;

    const time_spent = Math.round((Date.now() - cardStartTimeRef.current) / 1000);

    try {
      await api.post('/revisao', {
        flashcard_id: currentCard.flashcard_id,
        sub_id: currentCard.sub_id,
        rating,
        time_spent
      });

      setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
      nextCard();
    } catch (err) {
      console.error('Erro ao registar revisão:', err);
      alert('Erro ao guardar avaliação. Tenta novamente.');
    }
  }, [currentCard]);

  const nextCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentHintIndex(0);
    setTotalTime(0);

    const remaining = deck.slice(1);
    setDeck(remaining);
    const next = remaining[0] || null;
    setCurrentCard(next);

    if (next) {
      cardStartTimeRef.current = Date.now();
    }
  };

  const handleFlip = () => {
    const elapsed = Math.round((Date.now() - cardStartTimeRef.current) / 1000);
    if (elapsed < minReflectionTime) {
      alert(`Pensa mais um pouco! Aguarda pelo menos ${minReflectionTime} segundos antes de revelar a resposta.`);
      return;
    }
    setIsFlipped(true);
  };

  const handleShowHint = () => {
    if (currentCard?.hints?.length > 0) {
      setShowHint(true);
      if (currentHintIndex < currentCard.hints.length - 1) {
        setCurrentHintIndex(prev => prev + 1);
      }
    }
  };

  const renderClozeText = (text, subId, revealed = false) => {
    if (!text) return '';
    return text.replace(/\{\{c(\d+)::(.*?)\}\}/g, (match, num, content) => {
      if (num === subId) {
        return revealed
          ? `<strong class="text-green-700 bg-green-100 px-2 py-1 rounded">${content}</strong>`
          : `<strong class="text-blue-700 bg-blue-100 px-2 py-1 rounded">[...]</strong>`;
      }
      return content;
    });
  };

  // ====== useEffects ======

  useEffect(() => {
    const loadDailyDeck = async () => {
      try {
        const response = await api.get('/fila-diaria');
        const cards = response.data.data.cards || [];
        setFullDeck(cards);
        setDeck(cards);
        const uniqueDisciplines = [...new Set(cards.map(card => card.discipline_name))];
        setDisciplines(uniqueDisciplines);
        setStats({ total: cards.length, reviewed: 0 });
        if (cards.length > 0) {
          console.log(cards[0]);
          setCurrentCard(cards[0]);
          cardStartTimeRef.current = Date.now();
        }
      } catch (err) {
        console.error('Erro ao carregar deck:', err);
      } finally {
        setLoading(false);
      }
    };

    if (view === 'classic') {
      loadDailyDeck();
    }
  }, [view]);

  useEffect(() => {
    const filtered = disciplineFilter === 'all'
      ? fullDeck
      : fullDeck.filter(card => card.discipline_name === disciplineFilter);
    
    setDeck(filtered);
    setCurrentCard(filtered[0] || null);
    setStats(prev => ({ ...prev, total: filtered.length, reviewed: 0 }));
    setIsFlipped(false);
    setShowHint(false);
    setCurrentHintIndex(0);
  }, [disciplineFilter, fullDeck]);


  useEffect(() => {
    if (currentCard?.type === 'image_occlusion' && currentCard.image_url) {
      drawImageOcclusion(currentCard);
    }
  }, [currentCard, isFlipped, drawImageOcclusion]);

  useEffect(() => {
    let interval;
    if (currentCard && !isFlipped) {
      interval = setInterval(() => {
        if (cardStartTimeRef.current) {
          setTotalTime(Math.round((Date.now() - cardStartTimeRef.current) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentCard, isFlipped]);

  // ====== Render do Card ======

  const renderCardContent = () => {
    if (!currentCard) {
      return (
        <div className="text-center py-16">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Parabéns! 🎉</h2>
          <p className="text-xl text-gray-600">Terminaste todas as revisões de hoje!</p>
        </div>
      );
    }

    if (currentCard.type === 'basic') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-sm font-semibold text-gray-500 mb-2">{currentCard.discipline_name}</div>
          {/* Pergunta - sempre visível */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600 uppercase">Pergunta</span>
            </div>
            <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.front }} />
          </div>

          {/* Resposta - revelada quando flipped */}
          {!isFlipped ? (
            <button
              onClick={handleFlip}
              className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors"
            >
              Clica para revelar a resposta
            </button>
          ) : (
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-600 uppercase">Resposta</span>
              </div>
              <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.back }} />
            </div>
          )}
        </div>
      );
    }

    if (currentCard.type === 'cloze') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-sm font-semibold text-gray-500 mb-2">{currentCard.discipline_name}</div>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600 uppercase">Completa a frase</span>
          </div>
          
          <div className="text-xl leading-relaxed mb-6"
               dangerouslySetInnerHTML={{ __html: renderClozeText(currentCard.cloze_text, currentCard.sub_id, isFlipped) }} />
          
          {!isFlipped && (
            <button
              onClick={handleFlip}
              className="w-full py-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors"
            >
              Revelar resposta
            </button>
          )}
        </div>
      );
    }

    if (currentCard.type === 'image_occlusion') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-sm font-semibold text-gray-500 mb-2">{currentCard.discipline_name}</div>
          <p className="text-lg font-semibold text-indigo-800 mb-4">
            {!isFlipped ? 'Identifica a região oculta' : currentCard.sub_label}
          </p>
          {!isFlipped ? (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-96 rounded-lg shadow-md cursor-pointer mx-auto"
              onClick={handleFlip}
            />
          ) : (
            <img
              src={currentCard.image_url}
              alt="Resposta"
              className="max-w-full max-h-96 rounded-lg shadow-md mx-auto"
            />
          )}
        </div>
      );
    }

    if (currentCard.type === 'image_text') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-sm font-semibold text-gray-500 mb-2">{currentCard.discipline_name}</div>
          {/* Pergunta - sempre visível */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600 uppercase">Pergunta</span>
            </div>
            <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.front }} />
            {currentCard.image_url && <img src={currentCard.image_url} alt="Frente" className="mt-2 max-w-full h-48 object-cover rounded shadow-md mx-auto" />}
          </div>

          {/* Resposta - revelada quando flipped */}
          {!isFlipped ? (
            <button
              onClick={handleFlip}
              className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors"
            >
              Clica para revelar a resposta
            </button>
          ) : (
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-600 uppercase">Resposta</span>
              </div>
              <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.back }} />
              {currentCard.back_image_url && <img src={currentCard.back_image_url} alt="Verso" className="mt-2 max-w-full h-48 object-cover rounded shadow-md mx-auto" />}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ====== JSX ======

  if (loading && view === 'classic') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-indigo-800 font-semibold">A preparar a sessão de memória...</p>
        </div>
      </div>
    );
  }

  if (view === 'audio') {
    return <AudioStudentPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header compacto */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              🧠 Revisão Diária
            </h1>
            
            <div className="flex gap-2">
              <button
                onClick={() => setView('classic')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  view === 'classic' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Clássica
              </button>
              <button
                onClick={() => setView('audio')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  view === 'audio' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Áudio
              </button>
            </div>
          </div>

          <div className="mt-4">
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

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{stats.reviewed}</p>
              <p className="text-sm text-gray-600">Concluídas</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.total - stats.reviewed}</p>
              <p className="text-sm text-gray-600">Restantes</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <p className="text-2xl font-bold text-orange-600">{totalTime}s</p>
              </div>
              <p className="text-sm text-gray-600">Tempo atual</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="mb-6">
          {renderCardContent()}
        </div>

        {/* Dicas */}
        {currentCard?.hints?.length > 0 && !isFlipped && (
          <div className="mb-6">
            <button
              onClick={handleShowHint}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded-lg transition-colors font-medium"
            >
              <Lightbulb className="w-5 h-5" />
              Ver Dica ({currentHintIndex + 1}/{currentCard.hints.length})
            </button>

            {showHint && (
              <div className="mt-3 p-4 bg-white rounded-lg shadow-md">
                <p className="text-base text-gray-700">{currentCard.hints[currentHintIndex]}</p>
              </div>
            )}
          </div>
        )}

        {/* Botões de Avaliação - compactos e organizados */}
        {isFlipped && currentCard && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Tempo total: <strong className="text-indigo-600">{totalTime}s</strong></span>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <button 
                onClick={() => handleRating(1)} 
                className="flex flex-col items-center gap-2 p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <XCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Again</span>
              </button>
              
              <button 
                onClick={() => handleRating(2)} 
                className="flex flex-col items-center gap-2 p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <AlertCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Hard</span>
              </button>
              
              <button 
                onClick={() => handleRating(3)} 
                className="flex flex-col items-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Good</span>
              </button>
              
              <button 
                onClick={() => handleRating(4)} 
                className="flex flex-col items-center gap-2 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Brain className="w-6 h-6" />
                <span className="text-sm font-semibold">Easy</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoriaStudentPage;
