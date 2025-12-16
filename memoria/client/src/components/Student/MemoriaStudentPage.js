// src/components/Student/MemoriaStudentPage.js

import React, { useState, useEffect, useRef } from 'react';
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
  
  const canvasRef = useRef(null);

  useEffect(() => {
    loadDailyDeck();
  }, []);

  useEffect(() => {
    if (currentCard?.type === 'image_occlusion' && currentCard.image_url && !isFlipped) {
      drawImageOcclusion();
    }
  }, [currentCard, isFlipped]);

  const loadDailyDeck = async () => {
    try {
      const response = await api.get('/fila-diaria');
      setDeck(response.data.data.cards);
      setStats(prev => ({ ...prev, total: response.data.data.total }));
      if (response.data.data.cards.length > 0) {
        setCurrentCard(response.data.data.cards[0]);
      }
    } catch (err) {
      console.error('Erro ao carregar deck:', err);
    } finally {
      setLoading(false);
    }
  };

  const drawImageOcclusion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Desenhar imagem base
      ctx.drawImage(img, 0, 0);
      
      // Desenhar máscara preta sobre a região atual
      if (currentCard.sub_data) {
        const mask = currentCard.sub_data;
        if (mask.coords && Array.isArray(mask.coords) && mask.coords.length === 4) {
          const [x, y, width, height] = mask.coords;
          
          // Máscara preta
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(x, y, width, height);
          
          // Borda vermelha
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
          
          // Label
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(x, y + height - 30, width, 30);
          ctx.font = 'bold 14px sans-serif';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.fillText('?', x + width / 2, y + height - 10);
        }
      }
    };
    
    img.src = currentCard.image_url;
  };

  const handleRating = async (rating) => {
    if (!currentCard) return;

    try {
      await api.post('/revisao', {
        flashcard_id: currentCard.flashcard_id,
        sub_id: currentCard.sub_id,
        rating
      });

      setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
      nextCard();
    } catch (err) {
      console.error('Erro ao registar revisão:', err);
      alert('Erro ao guardar revisão');
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentHintIndex(0);
    const remaining = deck.slice(1);
    setDeck(remaining);
    setCurrentCard(remaining[0] || null);
  };

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleShowHint = () => {
    if (currentCard?.hints && currentCard.hints.length > 0) {
      setShowHint(true);
      if (currentHintIndex < currentCard.hints.length - 1) {
        setCurrentHintIndex(prev => prev + 1);
      }
    }
  };

  const renderClozeText = (text, subId, revealed = false) => {
    if (!text) return '';
    
    // Substituir todas as lacunas
    let processedText = text;
    const regex = /\{\{c(\d+)::(.*?)\}\}/g;
    
    processedText = processedText.replace(regex, (match, num, content) => {
      if (num === subId) {
        // Esta é a lacuna atual
        if (revealed) {
          return `<strong class="text-green-600 bg-green-100 px-2 py-1 rounded">${content}</strong>`;
        } else {
          return `<strong class="text-blue-600 bg-blue-100 px-2 py-1 rounded">[...]</strong>`;
        }
      } else {
        // Outras lacunas mostram sempre o conteúdo
        return `<span class="text-gray-700">${content}</span>`;
      }
    });
    
    return processedText;
  };

  const renderCardContent = () => {
    if (!currentCard) {
      return (
        <div className="text-center py-20">
          <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Parabéns! 🎉
          </h2>
          <p className="text-xl text-gray-600">
            Terminaste as revisões de hoje!
          </p>
        </div>
      );
    }

    // TIPO: BASIC (Frente e Verso)
    if (currentCard.type === 'basic') {
      return (
        <div className="relative">
          <div 
            className={`bg-white rounded-2xl shadow-2xl p-10 min-h-[400px] flex items-center justify-center cursor-pointer transition-all ${
              !isFlipped ? 'hover:shadow-3xl' : ''
            }`}
            onClick={!isFlipped ? handleFlip : undefined}
          >
            {!isFlipped ? (
              <div className="text-center">
                <h3 className="text-sm uppercase text-indigo-600 font-semibold mb-4">Pergunta</h3>
                <div 
                  className="text-2xl text-gray-800"
                  dangerouslySetInnerHTML={{ __html: currentCard.front }}
                />
                <p className="text-gray-500 mt-8 text-sm">Clica para revelar a resposta</p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-sm uppercase text-green-600 font-semibold mb-4">Resposta</h3>
                <div 
                  className="text-2xl text-gray-800"
                  dangerouslySetInnerHTML={{ __html: currentCard.back }}
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // TIPO: CLOZE (Lacunas)
    if (currentCard.type === 'cloze') {
      return (
        <div className="relative">
          <div 
            className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-2xl p-10 min-h-[400px] flex items-center justify-center cursor-pointer transition-all ${
              !isFlipped ? 'hover:shadow-3xl' : ''
            }`}
            onClick={!isFlipped ? handleFlip : undefined}
          >
            <div className="text-center max-w-3xl">
              <h3 className="text-sm uppercase text-purple-600 font-semibold mb-6">
                {!isFlipped ? 'Completa a lacuna' : 'Resposta'}
              </h3>
              <div 
                className="text-xl leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: renderClozeText(currentCard.cloze_text, currentCard.sub_id, isFlipped) 
                }}
              />
              {!isFlipped && (
                <p className="text-gray-500 mt-8 text-sm">Clica para revelar</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // TIPO: IMAGE OCCLUSION (Ocultação de Imagem)
    if (currentCard.type === 'image_occlusion') {
      return (
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-sm uppercase text-indigo-600 font-semibold mb-4 text-center">
              {!isFlipped ? 'Identifica a região oculta' : `Resposta: ${currentCard.sub_label}`}
            </h3>
            
            {!isFlipped ? (
              <div className="relative inline-block">
                <canvas 
                  ref={canvasRef}
                  className="max-w-full h-auto rounded-lg shadow-lg cursor-pointer"
                  onClick={handleFlip}
                />
                <p className="text-center text-gray-500 mt-4 text-sm">Clica para revelar</p>
              </div>
            ) : (
              <div className="text-center">
                <img 
                  src={currentCard.image_url}
                  alt="Resposta"
                  className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
                  crossOrigin="anonymous"
                />
                <div className="mt-6 p-4 bg-green-100 rounded-lg">
                  <p className="text-xl font-bold text-green-800">
                    {currentCard.sub_label}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return <p>Tipo de card desconhecido</p>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-xl text-gray-600">A carregar revisões diárias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header com Estatísticas */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            🧠 Revisão Diária
          </h1>
          
          <div className="inline-flex items-center gap-4 bg-white px-8 py-4 rounded-full shadow-lg">
            <div className="text-center">
              <p className="text-3xl font-bold text-indigo-600">{stats.reviewed}</p>
              <p className="text-sm text-gray-600">Concluídas</p>
            </div>
            <div className="w-px h-12 bg-gray-300"></div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.total - stats.reviewed}</p>
              <p className="text-sm text-gray-600">Restantes</p>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className="mb-8">
          {renderCardContent()}
        </div>

        {/* Dicas */}
        {currentCard && currentCard.hints && currentCard.hints.length > 0 && !isFlipped && (
          <div className="mb-6 text-center">
            <button
              onClick={handleShowHint}
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition font-medium"
            >
              <Lightbulb className="w-5 h-5" />
              Mostrar Dica ({currentHintIndex + 1}/{currentCard.hints.length})
            </button>
            
            {showHint && (
              <div className="mt-4 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg max-w-2xl mx-auto">
                <p className="text-yellow-900">{currentCard.hints[currentHintIndex]}</p>
              </div>
            )}
          </div>
        )}

        {/* Botões de Avaliação */}
        {isFlipped && currentCard && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <button
              onClick={() => handleRating(1)}
              className="flex flex-col items-center gap-2 px-6 py-5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <XCircle className="w-8 h-8" />
              <span className="font-bold text-lg">Again</span>
              <span className="text-sm opacity-90">&lt; 1 dia</span>
            </button>

            <button
              onClick={() => handleRating(2)}
              className="flex flex-col items-center gap-2 px-6 py-5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <AlertCircle className="w-8 h-8" />
              <span className="font-bold text-lg">Hard</span>
              <span className="text-sm opacity-90">Difícil</span>
            </button>

            <button
              onClick={() => handleRating(3)}
              className="flex flex-col items-center gap-2 px-6 py-5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <CheckCircle className="w-8 h-8" />
              <span className="font-bold text-lg">Good</span>
              <span className="text-sm opacity-90">Bom</span>
            </button>

            <button
              onClick={() => handleRating(4)}
              className="flex flex-col items-center gap-2 px-6 py-5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Brain className="w-8 h-8" />
              <span className="font-bold text-lg">Easy</span>
              <span className="text-sm opacity-90">Fácil</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default MemoriaStudentPage;
