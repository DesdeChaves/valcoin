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

const { calculateGlobalFlashcardStatistics } = require('./memoria.analytics'); // <-- New import

const {
  validarProfessorDisciplina,
  validarOwnershipFlashcard
} = require('./memoria.middleware');

const {
  upload: audioUpload,
  criarFlashcardPhonetic,
  criarFlashcardDictation,
  criarFlashcardAudioQuestion,
  criarFlashcardReading,
  criarFlashcardSpelling,
  gerarAudioFlashcard,
  validarRespostaTexto,
  validarRespostaAudio,
  getAudioAnalytics,
  getAudioFlashcardQueue
} = require('./audio_flashcards_controller');

const {
    getAvailableDisciplinesForExternalUser,
    subscribeExternalUserToDiscipline,
    getMySubscribedDisciplines
} = require('./memoria.external');

const imageUpload = require('./memoria.uploads');

const db = require('../db');

router.get('/disciplina_turma/professor/me', async (req, res) => {
  try {
    const professor_id = req.user.id;

    const result = await db.query(`
      SELECT 
        d.id AS disciplina_id,
        d.nome AS disciplina_nome,
        json_agg(
            json_build_object(
                'disciplina_turma_id', dt.id,
                'turma_id', t.id,
                'turma_nome', t.nome,
                'ano_letivo', dt.ano_letivo
            )
        ) AS turmas
      FROM disciplina_turma dt
      JOIN subjects d ON dt.disciplina_id = d.id
      JOIN classes t ON dt.turma_id = t.id
      WHERE dt.professor_id = $1 AND dt.ativo = true
      GROUP BY d.id, d.nome
      ORDER BY d.nome;
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

// ...

router.post('/upload-image', imageUpload.single('image'), uploadImage);

// ============================================================================
// ROTAS PARA FLASHCARDS DE ÁUDIO
// ============================================================================

router.post('/audio-flashcards/phonetic', validarProfessorDisciplina, criarFlashcardPhonetic);
router.post('/audio-flashcards/dictation', validarProfessorDisciplina, criarFlashcardDictation);
router.post('/audio-flashcards/audio-question', validarProfessorDisciplina, criarFlashcardAudioQuestion);
router.post('/audio-flashcards/reading', validarProfessorDisciplina, criarFlashcardReading);
router.post('/audio-flashcards/spelling', validarProfessorDisciplina, criarFlashcardSpelling);

router.get('/audio-flashcards/queue', getAudioFlashcardQueue);
router.get('/audio-flashcards/:flashcard_id/generate-audio', gerarAudioFlashcard);
router.post('/audio-flashcards/review/text', validarRespostaTexto);
router.post('/audio-flashcards/review/audio', audioUpload.single('audio'), validarRespostaAudio);

router.get('/audio-flashcards/analytics', getAudioAnalytics);


// ============================================================================
// ROTAS PARA ALUNOS
// ============================================================================

router.get('/fila-diaria', obterFilaDiaria);

router.post('/revisao', registarRevisao);

router.get('/flashcards/:id/review-times-percentiles', getFlashcardReviewTimePercentiles);

// New routes for external users to manage discipline subscriptions
router.get('/disciplines/available', getAvailableDisciplinesForExternalUser);
router.post('/disciplines/:discipline_id/subscribe', subscribeExternalUserToDiscipline);
router.get('/disciplines/my', getMySubscribedDisciplines);


// ============================================================================
// ROTAS PARA PROFESSORES
// ============================================================================

router.get('/analytics/disciplina/:discipline_id', validarProfessorDisciplina, getProfessorAnalytics);

router.post('/flashcards', validarProfessorDisciplina, criarFlashcard);

router.get('/flashcards', listarFlashcardsProfessor);

router.put('/flashcards/:id', validarProfessorDisciplina, validarOwnershipFlashcard, editarFlashcard);

router.delete('/flashcards/:id', validarProfessorDisciplina, validarOwnershipFlashcard, apagarFlashcard);

router.get('/assuntos/disciplina/:discipline_id', validarProfessorDisciplina, getAssuntos);

router.post('/upload-image', imageUpload.single('image'), uploadImage);


// ============================================================================

module.exports = router;
