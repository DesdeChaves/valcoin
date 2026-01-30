import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as memoriaApi from '../../services/memoria.api';
import { Brain, CheckCircle, XCircle, AlertCircle, Lightbulb, Clock, Target, HelpCircle } from 'lucide-react';
import AudioStudentPage from './AudioStudentPage';
import ConversionWheel from '../shared/ConversionWheel'; // NOVO IMPORT

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
  const [studentEnrolledDisciplines, setStudentEnrolledDisciplines] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [reviewedCardsIds, setReviewedCardsIds] = useState(new Set());
  const [againQueue, setAgainQueue] = useState([]);
  const [isImageError, setIsImageError] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewReason, setReviewReason] = useState("");
  const cardStartTimeRef = useRef(null);
  const imageContainerRef = useRef(null);

  const getCardUniqueId = (card) => {
    return `${card.flashcard_id}_${card.sub_id || 0}`;
  };

  const nextCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentHintIndex(0);
    setTotalTime(0);
    const remaining = deck.slice(1);
    setDeck(remaining);

    let next = null;

    if (remaining.length > 0) {
      next = remaining[0];
    } else if (againQueue.length > 0) {
      next = againQueue[0];
      setAgainQueue(prev => prev.slice(1));
    }

    setCurrentCard(next);
    if (next) {
      cardStartTimeRef.current = Date.now();
    }
  };

  const handleRating = useCallback(async (rating) => {
    if (!currentCard || !cardStartTimeRef.current) return;
    const time_spent = Math.round((Date.now() - cardStartTimeRef.current) / 1000);
    try {
      await memoriaApi.registerReview({
        flashcard_id: currentCard.flashcard_id,
        sub_id: currentCard.sub_id,
        rating,
        time_spent
      });
      if (rating === 1) {
        setAgainQueue(prev => [...prev, currentCard]);
        nextCard();
      } else {
        const cardId = getCardUniqueId(currentCard);
        setReviewedCardsIds(prev => new Set([...prev, cardId]));
        setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
        nextCard();
      }
    } catch (err) {
      console.error('Erro ao registar revisão:', err);
      alert('Erro ao guardar avaliação. Tenta novamente.');
    }
  }, [currentCard]);

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

  const handleOpenReviewModal = () => {
    setIsReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewReason("");
  };

  const handleSendReviewRequest = async () => {
    if (!currentCard || !reviewReason.trim()) {
      alert("Por favor, descreve o motivo do teu pedido.");
      return;
    }
    try {
      await memoriaApi.requestFlashcardReview({
        flashcard_id: currentCard.flashcard_id,
        motivo: reviewReason,
      });
      alert("O teu pedido de revisão foi enviado com sucesso!");
      handleCloseReviewModal();
    } catch (error) {
      console.error("Erro ao enviar pedido de revisão:", error);
      alert("Não foi possível enviar o teu pedido. Tenta novamente.");
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    const loadDailyDeck = async () => {
      try {
        const response = await memoriaApi.getDailyQueue();
        const cards = response.data.cards || [];
        setFullDeck(cards);
        setStats({ total: cards.length, reviewed: 0 });
        if (cards.length > 0) {
          console.log("First card in deck:", cards[0]);
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
    const fetchDisciplines = async () => {
      if (!currentUser) return;
      try {
        let response;
        if (currentUser.tipo_utilizador === 'ALUNO') {
          response = await memoriaApi.getStudentEnrolledDisciplines();
        } else if (currentUser.tipo_utilizador === 'EXTERNO') {
          response = await memoriaApi.getMySubscribedDisciplines();
        } else {
          return;
        }
        setStudentEnrolledDisciplines(response.data || []);
      } catch (err) {
        console.error('Erro ao carregar disciplinas:', err);
      }
    };
    fetchDisciplines();
  }, [currentUser]);

  useEffect(() => {
    const filtered = disciplineFilter === 'all'
      ? fullDeck
      : fullDeck.filter(card => card.effective_discipline_id === disciplineFilter);
    const notReviewedYet = filtered.filter(card => {
      const cardId = getCardUniqueId(card);
      return !reviewedCardsIds.has(cardId);
    });
    setDeck(notReviewedYet);
    setAgainQueue([]);
    setCurrentCard(notReviewedYet[0] || null);

    const reviewedInThisDiscipline = filtered.filter(card => {
      const cardId = getCardUniqueId(card);
      return reviewedCardsIds.has(cardId);
    }).length;

    setStats(prev => ({
      total: filtered.length,
      reviewed: reviewedInThisDiscipline
    }));

    setIsFlipped(false);
    setShowHint(false);
    setCurrentHintIndex(0);
  }, [disciplineFilter, fullDeck, reviewedCardsIds]);

  useEffect(() => {
    setIsImageError(false);
  }, [currentCard]);

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

  const renderCardContent = () => {
    if (!currentCard) {
      return (
        <div className="text-center py-16">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Parabéns! 🎉</h2>
          <p className="text-xl text-gray-600">
            {disciplineFilter === 'all' ? 'Terminaste todas as revisões de hoje!' : 'Terminaste todas as revisões desta disciplina!'}
          </p>
          <p className="text-base text-gray-500 mt-4">Volta amanhã para mais revisões 📚</p>
        </div>
      );
    }

    const cardHeader = (
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-gray-500">{currentCard.discipline_name}</div>
        <button onClick={handleOpenReviewModal} className="text-gray-400 hover:text-indigo-600 transition-colors">
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>
    );

    if (currentCard.type === 'basic') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {cardHeader}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600 uppercase">Pergunta</span>
            </div>
            <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.front }} />
          </div>
          {!isFlipped ? (
            <button onClick={handleFlip} className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors">
              Clica para revelar a resposta
            </button>
          ) : (
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex justify-between items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-600 uppercase">Resposta</span>
                </div>
                {currentCard.hints && currentCard.hints.length > 0 && (
                  <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-500">
                    <Lightbulb className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.back }} />
              {showHint && currentCard.hints && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{currentCard.hints[currentHintIndex]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (currentCard.type === 'cloze') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {cardHeader}
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600 uppercase">Completa a frase</span>
          </div>
          <div className="text-xl leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: renderClozeText(currentCard.cloze_text, currentCard.sub_id, isFlipped) }} />
          {!isFlipped ? (
            <button onClick={handleFlip} className="w-full py-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors">
              Revelar resposta
            </button>
          ) : (
            currentCard.hints && currentCard.hints.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-500 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  <span>Dica</span>
                </button>
                {showHint && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{currentCard.hints[currentHintIndex]}</p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      );
    }

    if (currentCard.type === 'image_occlusion') {
      if (isImageError) {
        return (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {cardHeader}
            <p className="text-lg font-semibold text-indigo-800 mb-4">{!isFlipped ? 'Identifica a região oculta' : currentCard.sub_label}</p>
            <div className="max-w-full max-h-96 rounded-lg shadow-md mx-auto border border-gray-300 flex items-center justify-center bg-red-50 text-red-700 p-4">
              <AlertCircle className="w-6 h-6 mr-2" />
              Erro ao carregar a imagem.
            </div>
            {!isFlipped && (
              <button onClick={handleFlip} className="mt-4 w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors">
                Clica para revelar a resposta
              </button>
            )}
          </div>
        );
      }

      let fracX = 0, fracY = 0, fracW = 0, fracH = 0;
      if (currentCard.sub_data?.coords && Array.isArray(currentCard.sub_data.coords) && currentCard.sub_data.coords.length === 4) {
        [fracX, fracY, fracW, fracH] = currentCard.sub_data.coords;
      }

      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {cardHeader}
          <p className="text-lg font-semibold text-indigo-800 mb-4 flex justify-between items-center">
            <span>{!isFlipped ? 'Identifica a região oculta' : currentCard.sub_label}</span>
            {isFlipped && currentCard.hints && currentCard.hints.length > 0 && (
              <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-500">
                <Lightbulb className="w-5 h-5" />
              </button>
            )}
          </p>
          {isFlipped && showHint && currentCard.hints && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{currentCard.hints[currentHintIndex]}</p>
            </div>
          )}
          
          <div 
            ref={imageContainerRef}
            className="relative mx-auto rounded-lg shadow-md border-2 border-gray-300 overflow-hidden"
            style={{ maxWidth: '800px', width: '100%' }}
          >
            <img
              key={getCardUniqueId(currentCard)}
              src={currentCard.image_url}
              alt="Imagem de estudo"
              className="w-full h-auto block"
              style={{ 
                maxHeight: '600px',
                objectFit: 'contain',
                display: 'block'
              }}
              onError={() => setIsImageError(true)}
            />
            
            {!isFlipped && fracW > 0 && fracH > 0 && (
              <>
                <div
                  className="absolute bg-black pointer-events-none"
                  style={{ 
                    left: `${fracX * 100}%`, 
                    top: `${fracY * 100}%`, 
                    width: `${fracW * 100}%`, 
                    height: `${fracH * 100}%`
                  }}
                />
                
                <div
                  className="absolute border-4 border-red-500 pointer-events-none"
                  style={{ 
                    left: `${fracX * 100}%`, 
                    top: `${fracY * 100}%`, 
                    width: `${fracW * 100}%`, 
                    height: `${fracH * 100}%`
                  }}
                />
                
                <div
                  className="absolute bg-red-600 flex items-center justify-center text-white font-bold pointer-events-none"
                  style={{
                    left: `${fracX * 100}%`,
                    top: `${(fracY + fracH) * 100}%`,
                    width: `${fracW * 100}%`,
                    height: '50px',
                    transform: 'translateY(-50px)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)'
                  }}
                >
                  ?
                </div>
              </>
            )}
          </div>

          {!isFlipped && (
            <button 
              onClick={handleFlip} 
              className="mt-6 w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors"
            >
              Clica para revelar a resposta
            </button>
          )}
        </div>
      );
    }

    if (currentCard.type === 'image_text') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {cardHeader}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600 uppercase">Pergunta</span>
            </div>
            <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.front }} />
            {currentCard.image_url && (
              <img 
                src={currentCard.image_url} 
                alt="Frente" 
                className="mt-4 max-w-full rounded shadow-md mx-auto" 
                style={{ maxHeight: '300px', objectFit: 'contain' }}
              />
            )}
          </div>
          {!isFlipped ? (
            <button onClick={handleFlip} className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors">
              Clica para revelar a resposta
            </button>
          ) : (
            <div className="bg-green-50 rounded-lg p-6">
              <div className="flex justify-between items-center gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-600 uppercase">Resposta</span>
                </div>
                {currentCard.hints && currentCard.hints.length > 0 && (
                  <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-500">
                    <Lightbulb className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="text-xl text-gray-800" dangerouslySetInnerHTML={{ __html: currentCard.back }} />
              {currentCard.back_image_url && (
                <img 
                  src={currentCard.back_image_url} 
                  alt="Verso" 
                  className="mt-4 max-w-full rounded shadow-md mx-auto" 
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                />
              )}
              {showHint && currentCard.hints && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{currentCard.hints[currentHintIndex]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ============================================
    // NOVO TIPO: RODA DE CONVERSÃO
    // ============================================
    if (currentCard.type === 'roda') {
      return (
        <div className="bg-white rounded-xl shadow-lg p-8">
          {cardHeader}
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚙️</span>
            <span className="text-sm font-semibold text-indigo-600 uppercase">
              Roda de Conversão
            </span>
          </div>

          {/* Pergunta/Contexto */}
          {currentCard.front && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
              <p className="text-lg text-gray-800 font-medium">
                {currentCard.front}
              </p>
            </div>
          )}

          {/* Roda - Estado Pergunta (não flipped) */}
          {!isFlipped && currentCard.roda_pergunta && (
            <div className="mb-6">
              <ConversionWheel 
                config={currentCard.roda_pergunta} 
                revealed={false} 
              />
            </div>
          )}

          {/* Botão Revelar */}
          {!isFlipped ? (
            <button 
              onClick={handleFlip} 
              className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-medium transition-colors"
            >
              Revelar resposta
            </button>
          ) : (
            <div className="space-y-4">
              {/* Roda - Estado Resposta (flipped) */}
              {currentCard.roda_resposta && (
                <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                  <div className="flex justify-between items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-600 uppercase">
                        Solução
                      </span>
                    </div>
                    {currentCard.hints && currentCard.hints.length > 0 && (
                      <button onClick={() => setShowHint(!showHint)} className="text-gray-400 hover:text-yellow-500">
                        <Lightbulb className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <ConversionWheel 
                    config={currentCard.roda_resposta} 
                    revealed={true} 
                  />
                  {showHint && currentCard.hints && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">{currentCard.hints[currentHintIndex]}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Explicação Adicional (se existir) */}
              {currentCard.roda_resposta_opcional && (
                <div className="bg-white border-2 border-green-300 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 font-bold text-2xl flex-shrink-0">💡</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-700 mb-2">Explicação</p>
                      <p className="text-gray-700 leading-relaxed">
                        {currentCard.roda_resposta_opcional}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

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

  const renderReviewModal = () => {
    if (!isReviewModalOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Pedir Revisão da Flashcard</h2>
          <p className="text-gray-600 mb-4">
            Encontraste algum problema ou tens alguma dúvida sobre esta flashcard? Descreve abaixo o que podemos melhorar.
          </p>
          <textarea
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
            className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ex: A resposta parece estar incorreta, a pergunta não é clara, etc."
          />
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={handleCloseReviewModal}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendReviewRequest}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Enviar Pedido
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">🧠 Revisão Diária</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('classic')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${view === 'classic' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Clássica
              </button>
              <button onClick={() => setView('audio')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${view === 'audio' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Áudio
              </button>
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="discipline-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Disciplina</label>
            <select id="discipline-filter" value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
              <option value="all">Todas as Disciplinas</option>
              {studentEnrolledDisciplines.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{stats.reviewed}</p>
              <p className="text-sm text-gray-600">Concluídas</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{deck.length}</p>
              <p className="text-sm text-gray-600">Pendentes</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{againQueue.length}</p>
              <p className="text-sm text-gray-600">Again</p>
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
        <div className="mb-6">{renderCardContent()}</div>

        {isFlipped && currentCard && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-4 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Tempo total: <strong className="text-indigo-600">{totalTime}s</strong></span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => handleRating(1)} className="flex flex-col items-center gap-2 p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg">
                <XCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Again</span>
              </button>
              <button onClick={() => handleRating(2)} className="flex flex-col items-center gap-2 p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg">
                <AlertCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Hard</span>
              </button>
              <button onClick={() => handleRating(3)} className="flex flex-col items-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg">
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Good</span>
              </button>
              <button onClick={() => handleRating(4)} className="flex flex-col items-center gap-2 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg">
                <Brain className="w-6 h-6" />
                <span className="text-sm font-semibold">Easy</span>
              </button>
            </div>
          </div>
        )}
      </div>
      {renderReviewModal()}
    </div>
  );
};

export default MemoriaStudentPage;
