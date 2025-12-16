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
} = require('./memoria.controller');

const {
  validarProfessorDisciplina,
  validarOwnershipFlashcard
} = require('./memoria.middleware');

const { getProfessorDisciplinaTurma } = require('../disciplina_turma');
const upload = require('./memoria.uploads');

/**
 * GET /api/memoria/disciplina_turma/professor/me
 * Obter as disciplinas do professor autenticado
 */
router.get(
  '/disciplina_turma/professor/me',
  (req, res) => {
    // We need to create a new req object for getProfessorDisciplinaTurma
    const newReq = { ...req, params: { professorId: req.user.id } };
    return getProfessorDisciplinaTurma(newReq, res);
  }
);


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

/**
 * PUT /api/memoria/flashcards/:id
 * Editar um flashcard existente
 */
router.put(
    '/flashcards/:id',
    validarOwnershipFlashcard,
    editarFlashcard
);

/**
 * DELETE /api/memoria/flashcards/:id
 * Apagar um flashcard
 */
router.delete(
    '/flashcards/:id',
    validarOwnershipFlashcard,
    apagarFlashcard
);


/**
 * GET /api/memoria/assuntos/disciplina/:discipline_id
 * Obter todos os assuntos de uma disciplina
 */
router.get(
    '/assuntos/disciplina/:discipline_id',
    validarProfessorDisciplina, // Valida se o professor tem acesso a esta disciplina
    getAssuntos
);


/**
 * POST /api/memoria/upload-image
 * Fazer upload de uma imagem para o flashcard de oclusão de imagem
 */
router.post(
    '/upload-image',
    upload.single('image'),
    uploadImage
);

// Futuras rotas de professor (quando implementares)
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

/**
 * GET /api/memoria/flashcards/:id/review-times-percentiles
 * Obter percentis de tempo de revisão para um flashcard específico
 */
router.get(
  '/flashcards/:id/review-times-percentiles',
  getFlashcardReviewTimePercentiles
);

// ============================================================================

module.exports = router;