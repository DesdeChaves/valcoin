// src/components/Student/MemoriaStudentPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';
import { Brain, CheckCircle, XCircle, AlertCircle, Lightbulb } from 'lucide-react';

const MemoriaStudentPage = () => {
  const [deck, setDeck] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, reviewed: 0 });
  const [showHint, setShowHint] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [minReflectionTime] = useState(5); // Tempo mínimo para revelar resposta (segundos)
  const [totalTime, setTotalTime] = useState(0); // Tempo total desde aparecimento do card

  const canvasRef = useRef(null);
  const cardStartTimeRef = useRef(null); // Momento em que o card apareceu

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

    const time_spent = Math.round((Date.now() - cardStartTimeRef.current) / 1000); // Tempo total

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
      cardStartTimeRef.current = Date.now(); // Reinicia cronómetro para novo card
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
          ? `<strong class="text-green-700 bg-green-100 px-4 py-2 rounded-lg">${content}</strong>`
          : `<strong class="text-blue-700 bg-blue-100 px-4 py-2 rounded-lg">[..........]</strong>`;
      }
      return `<span>${content}</span>`;
    });
  };

  // ====== useEffects ======

  useEffect(() => {
    const loadDailyDeck = async () => {
      try {
        const response = await api.get('/fila-diaria');
        const cards = response.data.data.cards || [];
        setDeck(cards);
        setStats({ total: response.data.data.total || cards.length, reviewed: 0 });
        if (cards.length > 0) {
          setCurrentCard(cards[0]);
          cardStartTimeRef.current = Date.now(); // Inicia cronómetro
        }
      } catch (err) {
        console.error('Erro ao carregar deck:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDailyDeck();
  }, []);

  useEffect(() => {
    if (currentCard?.type === 'image_occlusion' && currentCard.image_url) {
      drawImageOcclusion(currentCard);
    }
  }, [currentCard, isFlipped, drawImageOcclusion]);

  // Cronómetro total (desde aparecimento do card)
  useEffect(() => {
    let interval;
    if (currentCard && !isFlipped) { // Só conta enquanto não revelou
      interval = setInterval(() => {
        if (cardStartTimeRef.current) {
          setTotalTime(Math.round((Date.now() - cardStartTimeRef.current) / 1000));
        }
      }, 1000);
    } else if (isFlipped) {
      // Quando revela, para o cronómetro (o tempo final já foi registado no handleRating)
      setTotalTime(prev => prev);
    }
    return () => clearInterval(interval);
  }, [currentCard, isFlipped]);

  // ====== Render do Card ======

  const renderCardContent = () => {
    if (!currentCard) {
      return (
        <div className="text-center py-20">
          <CheckCircle className="w-32 h-32 text-green-500 mx-auto mb-8" />
          <h2 className="text-5xl font-bold text-gray-800 mb-6">Parabéns! 🎉</h2>
          <p className="text-3xl text-gray-600">Terminaste todas as revisões de hoje!</p>
        </div>
      );
    }

    const baseClasses = "rounded-3xl shadow-2xl p-12 min-h-96 flex items-center justify-center transition-all";

    if (currentCard.type === 'basic') {
      return (
        <div className={`${baseClasses} ${!isFlipped ? 'bg-white hover:shadow-3xl cursor-pointer' : 'bg-gradient-to-br from-green-50 to-emerald-100'}`}
             onClick={!isFlipped ? handleFlip : undefined}>
          <div className="text-center max-w-4xl">
            {!isFlipped ? (
              <>
                <p className="text-lg uppercase text-indigo-600 font-semibold mb-8">Pergunta</p>
                <div className="text-4xl text-gray-800 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: currentCard.front }} />
              </>
            ) : (
              <>
                <p className="text-lg uppercase text-green-600 font-semibold mb-8">Resposta</p>
                <div className="text-4xl text-gray-800 whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: currentCard.back }} />
              </>
            )}
          </div>
        </div>
      );
    }

    if (currentCard.type === 'cloze') {
      return (
        <div className={`${baseClasses} ${!isFlipped ? 'bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-3xl cursor-pointer' : 'bg-gradient-to-br from-purple-100 to-pink-100'}`}
             onClick={!isFlipped ? handleFlip : undefined}>
          <div className="text-center max-w-5xl">
            <div className="text-4xl leading-relaxed"
                 dangerouslySetInnerHTML={{ __html: renderClozeText(currentCard.cloze_text, currentCard.sub_id, isFlipped) }} />
          </div>
        </div>
      );
    }

    if (currentCard.type === 'image_occlusion') {
      return (
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
          <p className="text-2xl font-semibold text-indigo-800 mb-8">
            {!isFlipped ? 'Identifica a região oculta' : currentCard.sub_label}
          </p>
          {!isFlipped ? (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-96 rounded-2xl shadow-xl cursor-pointer"
              onClick={handleFlip}
            />
          ) : (
            <img
              src={currentCard.image_url}
              alt="Resposta"
              className="max-w-full max-h-96 rounded-2xl shadow-xl mx-auto"
            />
          )}
        </div>
      );
    }

    return null;
  };

  // ====== JSX ======

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <Brain className="w-24 h-24 text-indigo-600 mx-auto mb-8 animate-pulse" />
          <p className="text-3xl text-indigo-800 font-semibold">A preparar a sessão de memória...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-12 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-8">
            🧠 Revisão Diária
          </h1>

          <div className="flex justify-center items-center gap-16">
            <div className="text-center">
              <p className="text-5xl font-bold text-indigo-600">{stats.reviewed}</p>
              <p className="text-2xl text-gray-600">Concluídas</p>
            </div>
            <div className="w-px h-24 bg-gray-300"></div>
            <div className="text-center">
              <p className="text-5xl font-bold text-purple-600">{stats.total - stats.reviewed}</p>
              <p className="text-2xl text-gray-600">Restantes</p>
            </div>
            <div className="w-px h-24 bg-gray-300"></div>
            <div className="text-center">
              <p className="text-5xl font-bold text-orange-600">{totalTime}s</p>
              <p className="text-2xl text-gray-600">Tempo atual</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="mb-16">
          {renderCardContent()}
        </div>

        {/* Dicas */}
        {currentCard?.hints?.length > 0 && !isFlipped && (
          <div className="text-center mb-12">
            <button
              onClick={handleShowHint}
              className="inline-flex items-center gap-4 px-10 py-6 bg-yellow-400 text-yellow-900 rounded-2xl shadow-2xl hover:bg-yellow-300 transition text-2xl font-bold"
            >
              <Lightbulb className="w-10 h-10" />
              Dica ({currentHintIndex + 1}/{currentCard.hints.length})
            </button>

            {showHint && (
              <div className="mt-8 p-8 bg-white rounded-3xl shadow-2xl max-w-4xl mx-auto">
                <p className="text-3xl text-gray-800">{currentCard.hints[currentHintIndex]}</p>
              </div>
            )}
          </div>
        )}

        {/* Botões de Avaliação */}
        {isFlipped && currentCard && (
          <div className="bg-white rounded-3xl shadow-2xl p-12">
            <p className="text-center text-3xl text-gray-700 mb-10">
              Tempo total: <span className="font-bold text-indigo-600">{totalTime}s</span>
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 max-w-5xl mx-auto">
              <button onClick={() => handleRating(1)} className="flex flex-col items-center gap-6 p-10 bg-red-500 text-white rounded-3xl hover:bg-red-600 transition-all shadow-2xl hover:shadow-3xl text-2xl font-bold">
                <XCircle className="w-20 h-20" />
                Again
              </button>
              <button onClick={() => handleRating(2)} className="flex flex-col items-center gap-6 p-10 bg-orange-500 text-white rounded-3xl hover:bg-orange-600 transition-all shadow-2xl hover:shadow-3xl text-2xl font-bold">
                <AlertCircle className="w-20 h-20" />
                Hard
              </button>
              <button onClick={() => handleRating(3)} className="flex flex-col items-center gap-6 p-10 bg-green-500 text-white rounded-3xl hover:bg-green-600 transition-all shadow-2xl hover:shadow-3xl text-2xl font-bold">
                <CheckCircle className="w-20 h-20" />
                Good
              </button>
              <button onClick={() => handleRating(4)} className="flex flex-col items-center gap-6 p-10 bg-blue-500 text-white rounded-3xl hover:bg-blue-600 transition-all shadow-2xl hover:shadow-3xl text-2xl font-bold">
                <Brain className="w-20 h-20" />
                Easy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoriaStudentPage;
