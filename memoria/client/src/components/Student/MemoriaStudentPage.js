// ./components/Student/MemoriaStudentPage.js

import React, { useState, useEffect } from 'react';
import memoriaApi from '../../services/memoria';
import './MemoriaStudentPage.css'; // vais criar

const MemoriaStudentPage = () => {
  const [deck, setDeck] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, reviewed: 0 });

  useEffect(() => {
    loadDailyDeck();
  }, []);

  const loadDailyDeck = async () => {
    try {
      const response = await memoriaApi.getFilaDiaria();
      setDeck(response.data.data.cards);
      setStats(prev => ({ ...prev, total: response.data.data.total }));
      if (response.data.data.cards.length > 0) {
        setCurrentCard(response.data.data.cards[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (rating) => {
    if (!currentCard) return;

    try {
      await memoriaApi.registarRevisao(
        currentCard.flashcard_id,
        currentCard.sub_id,
        rating
      );

      setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
      nextCard();
    } catch (err) {
      alert('Erro ao guardar revisão');
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    const remaining = deck.slice(1);
    setDeck(remaining);
    setCurrentCard(remaining[0] || null);
  };

  const renderCard = () => {
    if (!currentCard) return <p>Parabéns! Terminaste as revisões de hoje 🎉</p>;

    return (
      <div className="flashcard-container">
        <div className={`flashcard ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
          <div className="front">
            <div dangerouslySetInnerHTML={{ __html: currentCard.front || 'Clique para ver' }} />
            {currentCard.image_url && (
              <img src={currentCard.image_url} alt="card" style={{ maxWidth: '100%' }} />
            )}
          </div>
          <div className="back">
            <div dangerouslySetInnerHTML={{ __html: currentCard.back || currentCard.sub_label || 'Sem resposta' }} />
          </div>
        </div>

        {isFlipped && (
          <div className="rating-buttons">
            <button onClick={() => handleRating(1)}>Again</button>
            <button onClick={() => handleRating(2)}>Hard</button>
            <button onClick={() => handleRating(3)}>Good</button>
            <button onClick={() => handleRating(4)}>Easy</button>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <p>A carregar revisões diárias...</p>;

  return (
    <div className="memoria-student-page">
      <h1>🧠 Revisão Diária</h1>
      <p>{stats.reviewed} / {stats.total} concluídas</p>
      {renderCard()}
    </div>
  );
};

export default MemoriaStudentPage;
