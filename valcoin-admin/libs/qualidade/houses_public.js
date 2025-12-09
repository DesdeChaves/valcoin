const express = require('express');
const db = require('../db');

const publicHousesRouter = () => {
  const router = express.Router();

  router.get('/stats', async (req, res) => {
    try {
      const housesQuery = 'SELECT houses_array FROM houses_overview';
      const housesResult = await db.query(housesQuery);
      const houses = housesResult.rows[0]?.houses_array || [];

      // Mocking these for now, as the queries are complex and need more time
      const weeklyPoints = [
        { semana: 'Sem 1', Amistad: 450, Altruismo: 520, Isibindi: 480, Rêveur: 510 },
        { semana: 'Sem 2', Amistad: 520, Altruismo: 490, Isibindi: 510, Rêveur: 470 },
        { semana: 'Sem 3', Amistad: 480, Altruismo: 550, Isibindi: 490, Rêveur: 520 },
        { semana: 'Sem 4', Amistad: 510, Altruismo: 530, Isibindi: 500, Rêveur: 540 }
      ];
      
      const categoryPoints = [
        { categoria: 'Académico', Amistad: 350, Altruismo: 420, Isibindi: 380, Rêveur: 410 },
        { categoria: 'Comportamento', Amistad: 420, Altruismo: 390, Isibindi: 410, Rêveur: 400 },
        { categoria: 'Liderança', Amistad: 380, Altruismo: 410, Isibindi: 390, Rêveur: 420 },
        { categoria: 'Desporto', Amistad: 390, Altruismo: 370, Isibindi: 430, Rêveur: 380 },
        { categoria: 'Serviço', Amistad: 370, Altruismo: 450, Isibindi: 360, Rêveur: 390 }
      ];
      
      const recentEvents = [
        { house: 'Altruismo', evento: 'Campanha de Recolha de Alimentos', pontos: 150, data: '2024-12-06', tipo: 'Serviço' },
        { house: 'Rêveur', evento: 'Desafio Matemático Inter-Anos', pontos: 120, data: '2024-12-05', tipo: 'Académico' },
        { house: 'Isibindi', evento: 'Torneio de Basquetebol', pontos: 100, data: '2024-12-04', tipo: 'Desporto' }
      ];

      res.json({
        houses,
        weeklyPoints,
        categoryPoints,
        recentEvents,
      });
    } catch (error) {
      console.error('Error fetching houses stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = publicHousesRouter;
