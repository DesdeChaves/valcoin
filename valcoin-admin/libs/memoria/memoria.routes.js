// libs/memoria/memoria.routes.js

const express = require('express');
const router = express.Router();

const {
  criarFlashcard,
  listarFlashcardsProfessor,
  obterFilaDiaria,
  registarRevisao,
  uploadImage,
  getFlashcardReviewTimePercentiles,
  getAssuntos,
  editarFlashcard,
  apagarFlashcard,
  getProfessorAnalytics
} = require('./memoria.controller');

const {
  validarProfessorDisciplina,
  validarOwnershipFlashcard
} = require('./memoria.middleware');

const upload = require('./memoria.uploads');
const db = require('../db'); // Necessário para a rota de disciplinas do professor

// ============================================================================
// ROTA PARA OBTER AS DISCIPLINAS/TURMAS DO PROFESSOR AUTENTICADO
// ============================================================================

router.get('/disciplina_turma/professor/me', async (req, res) => {
  try {
    const professor_id = req.user.id;

    const result = await db.query(`
      SELECT 
        dt.id AS disciplina_turma_id,
        dt.disciplina_id,
        s.nome AS disciplina_nome,
        dt.turma_id,
        t.nome AS turma_nome,
        t.ano_letivo
      FROM professor_disciplina_turma pdt
      JOIN disciplina_turma dt ON dt.id = pdt.disciplina_turma_id
      JOIN subjects s ON s.id = dt.disciplina_id
      JOIN classes t ON t.id = dt.turma_id
      WHERE pdt.professor_id = $1 
        AND pdt.ativo = true 
        AND dt.ativo = true
      ORDER BY t.ano_letivo DESC, s.nome, t.nome
    `, [professor_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao obter disciplinas do professor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar as tuas disciplinas'
    });
  }
});

// ============================================================================
// ROTAS PARA PROFESSORES
// ============================================================================

router.get('/analytics/disciplina/:discipline_id', validarProfessorDisciplina, getProfessorAnalytics);

router.post('/flashcards', validarProfessorDisciplina, criarFlashcard);

router.get('/flashcards', listarFlashcardsProfessor);

router.put('/flashcards/:id', validarProfessorDisciplina, validarOwnershipFlashcard, editarFlashcard);

router.delete('/flashcards/:id', validarProfessorDisciplina, validarOwnershipFlashcard, apagarFlashcard);

router.get('/assuntos/disciplina/:discipline_id', validarProfessorDisciplina, getAssuntos);

router.post('/upload-image', upload.single('image'), uploadImage);

// ============================================================================
// ROTAS PARA ALUNOS
// ============================================================================

router.get('/fila-diaria', obterFilaDiaria);

router.post('/revisao', registarRevisao);

router.get('/flashcards/:id/review-times-percentiles', getFlashcardReviewTimePercentiles);

// ============================================================================

module.exports = router;
