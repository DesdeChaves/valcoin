const express = require('express');
const db = require('../db');

const publicCriteriosSucessoRouter = () => {
  const router = express.Router();

  router.get('/stats', async (req, res) => {
    try {
      const departamentosQuery = 'SELECT * FROM v_dashboard_departamento';
      const departamentosResult = await db.query(departamentosQuery);
      const departamentos = departamentosResult.rows;

      // Mocking these for now, as the queries are complex and need more time
      const criteriosPendentes = [
        {
          criterio_codigo: 'MAT-7-01',
          criterio_nome: 'Resolver equações do 1º grau',
          departamento_nome: 'Matemática',
          ano_escolaridade_inicial: 7,
          nivel_aceitavel: 3,
          alunos_pendentes: 23,
          media_pontuacao_atual: 2.1,
          taxa_sucesso: 45
        },
        {
          criterio_codigo: 'PORT-8-03',
          criterio_nome: 'Identificar recursos estilísticos',
          departamento_nome: 'Português',
          ano_escolaridade_inicial: 8,
          nivel_aceitavel: 3,
          alunos_pendentes: 31,
          media_pontuacao_atual: 1.9,
          taxa_sucesso: 38
        },
        {
          criterio_codigo: 'CN-9-02',
          criterio_nome: 'Interpretar gráficos de funções',
          departamento_nome: 'Ciências',
          ano_escolaridade_inicial: 9,
          nivel_aceitavel: 3,
          alunos_pendentes: 18,
          media_pontuacao_atual: 2.4,
          taxa_sucesso: 58
        }
      ];

      const evolucaoMensal = [
        { mes: 'Set', avaliados: 45, sucesso: 32, taxa: 71 },
        { mes: 'Out', avaliados: 68, sucesso: 51, taxa: 75 },
        { mes: 'Nov', avaliados: 82, sucesso: 64, taxa: 78 },
        { mes: 'Dez', avaliados: 95, sucesso: 73, taxa: 77 },
        { mes: 'Jan', avaliados: 110, sucesso: 87, taxa: 79 }
      ];

      const distribuicaoPontuacoes = [
        { nivel: '1 - Iniciado', count: 45, cor: '#ef4444' },
        { nivel: '2 - Em Progresso', count: 78, cor: '#f59e0b' },
        { nivel: '3 - Proficiente', count: 112, cor: '#10b981' },
        { nivel: '4 - Avançado', count: 68, cor: '#3b82f6' }
      ];
      
      res.json({
        departamentos,
        criteriosPendentes,
        evolucaoMensal,
        distribuicaoPontuacoes,
      });
    } catch (error) {
      console.error('Error fetching criterios de sucesso stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

module.exports = publicCriteriosSucessoRouter;
