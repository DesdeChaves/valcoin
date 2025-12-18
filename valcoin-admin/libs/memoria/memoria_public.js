// libs/memoria/memoria_public.js

const express = require('express');
const router = express.Router();

const { calculateGlobalFlashcardStatistics } = require('./memoria.analytics');

router.get('/global-stats', async (req, res) => {
  try {
    const stats = await calculateGlobalFlashcardStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erro ao obter estatísticas globais de flashcards:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar estatísticas globais de flashcards.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
