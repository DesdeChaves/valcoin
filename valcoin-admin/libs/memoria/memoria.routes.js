// libs/memoria/memoria.routes.js

const express = require('express');
const router = express.Router();

const {
  criarFlashcard,
  listarFlashcardsProfessor,
  obterFilaDiaria,
  registarRevisao
  // Adicionar mais controllers aqui quando implementares (editar, apagar, stats, etc.)
} = require('./memoria.controller');

const {
  validarProfessorDisciplina,
  validarOwnershipFlashcard
} = require('./memoria.middleware');

// Middlewares globais já definidos no server principal
// Serão aplicados no valcoin_server.js: authenticateJWT + role checks

// ============================================================================
// ROTAS PARA PROFESSORES
// ============================================================================

/**
 * POST /api/memoria/flashcards
 * Criar novo flashcard (basic, cloze ou image_occlusion)
 * Requer: professor que leciona a discipline_id
 */
router.post(
  '/flashcards',
  validarProfessorDisciplina,        // verifica discipline_id no body
  criarFlashcard
);

/**
 * GET /api/memoria/flashcards
 * Listar flashcards criados pelo professor autenticado
 * Opcional: ?discipline_id=uuid para filtrar
 */
router.get(
  '/flashcards',
  listarFlashcardsProfessor
);

// Futuras rotas de professor (quando implementares)
// router.put('/flashcards/:id', validarProfessorDisciplina, validarOwnershipFlashcard, editarFlashcard);
// router.delete('/flashcards/:id', validarProfessorDisciplina, validarOwnershipFlashcard, apagarFlashcard);
// router.get('/estatisticas/disciplina/:id', ...);

// ============================================================================
// ROTAS PARA ALUNOS
// ============================================================================

/**
 * GET /api/memoria/fila-diaria
 * Obter flashcards devido hoje (misturados de todas as disciplinas)
 * Usa FSRS para calcular o que está devido
 */
router.get(
  '/fila-diaria',
  obterFilaDiaria
);

/**
 * POST /api/memoria/revisao
 * Registar revisão de um flashcard
 * Body: { flashcard_id: uuid, sub_id: string|null, rating: 1-4 }
 * Atualiza estado FSRS e log
 */
router.post(
  '/revisao',
  registarRevisao
);

// ============================================================================

module.exports = router;
