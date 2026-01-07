// libs/memoria/audio_flashcards.controller.js

const db = require('../db');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { MemoriaScheduler } = require('./memoria.scheduler');

const scheduler = new MemoriaScheduler();

// URL do serviço Python de áudio
const AUDIO_SERVICE_URL = process.env.AUDIO_SERVICE_URL || 'http://valcoin_audio_service:8001';

// Configurar multer para upload de áudio (em memória, não salvar)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de ficheiro não suportado'));
    }
  }
});

// ============================================
// CRIAR FLASHCARDS DE CADA TIPO
// ============================================

/**
 * Criar flashcard PHONETIC (fonemas animados)
 */
const criarFlashcardPhonetic = async (req, res) => {
  try {
    const {
      discipline_id,
      word,
      phonemes, // [{ text: 'pa', order: 1 }, ...]
      image_url,
      scheduled_date,
      assunto_name,
      idioma = 'pt'
    } = req.body;

    const creator_id = req.user.id;

    if (!discipline_id || !word || !phonemes || !Array.isArray(phonemes)) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id, word e phonemes são obrigatórios'
      });
    }

    let assunto_id = null;
    if (assunto_name) {
      const { findOrCreateAssunto } = require('./assuntos');
      const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
      assunto_id = assunto.id;
    }

    const result = await db.query(
      `INSERT INTO flashcards
       (discipline_id, creator_id, type, word, phonemes, image_url, 
        expected_answer, answer_type, scheduled_date, assunto_id, idioma)
       VALUES ($1, $2, 'phonetic', $3, $4, $5, $6, 'audio', $7, $8, $9)
       RETURNING *`,
      [discipline_id, creator_id, word, JSON.stringify(phonemes), 
       image_url, word, scheduled_date, assunto_id, idioma]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar flashcard phonetic:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar flashcard'
    });
  }
};

/**
 * Criar flashcard DICTATION (ditado)
 */
const criarFlashcardDictation = async (req, res) => {
  try {
    const {
      discipline_id,
      audio_text, // Texto que será convertido em áudio
      expected_answer, // Geralmente igual ao audio_text
      scheduled_date,
      assunto_name,
      difficulty_level,
      idioma = 'pt'
    } = req.body;

    const creator_id = req.user.id;

    if (!discipline_id || !audio_text || !expected_answer) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id, audio_text e expected_answer são obrigatórios'
      });
    }

    let assunto_id = null;
    if (assunto_name) {
      const { findOrCreateAssunto } = require('./assuntos');
      const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
      assunto_id = assunto.id;
    }

    const result = await db.query(
      `INSERT INTO flashcards
       (discipline_id, creator_id, type, audio_text, expected_answer, 
        answer_type, difficulty_level, scheduled_date, assunto_id, idioma)
       VALUES ($1, $2, 'dictation', $3, $4, 'text', $5, $6, $7, $8)
       RETURNING *`,
      [discipline_id, creator_id, audio_text, expected_answer, 
       difficulty_level || 1, scheduled_date, assunto_id, idioma]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar flashcard dictation:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar flashcard'
    });
  }
};

/**
 * Criar flashcard AUDIO_QUESTION (pergunta em áudio, ex: tabuada)
 */
const criarFlashcardAudioQuestion = async (req, res) => {
  try {
    const {
      discipline_id,
      audio_text, // Pergunta em texto (ex: "Quanto é 5 vezes 4?")
      expected_answer, // Resposta (ex: "20" ou "vinte")
      scheduled_date,
      assunto_name,
      difficulty_level,
      idioma = 'pt'
    } = req.body;

    const creator_id = req.user.id;

    if (!discipline_id || !audio_text || !expected_answer) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id, audio_text e expected_answer são obrigatórios'
      });
    }

    let assunto_id = null;
    if (assunto_name) {
      const { findOrCreateAssunto } = require('./assuntos');
      const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
      assunto_id = assunto.id;
    }

    const result = await db.query(
      `INSERT INTO flashcards
       (discipline_id, creator_id, type, audio_text, expected_answer, 
        answer_type, difficulty_level, scheduled_date, assunto_id, idioma)
       VALUES ($1, $2, 'audio_question', $3, $4, 'audio', $5, $6, $7, $8)
       RETURNING *`,
      [discipline_id, creator_id, audio_text, expected_answer, 
       difficulty_level || 1, scheduled_date, assunto_id, idioma]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar flashcard audio_question:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar flashcard'
    });
  }
};

/**
 * Criar flashcard READING (leitura em voz alta)
 */
const criarFlashcardReading = async (req, res) => {
  try {
    const {
      discipline_id,
      word, // Texto para ler
      expected_answer, // Geralmente igual ao word
      scheduled_date,
      assunto_name,
      difficulty_level,
      idioma = 'pt'
    } = req.body;

    const creator_id = req.user.id;

    if (!discipline_id || !word || !expected_answer) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id, word e expected_answer são obrigatórios'
      });
    }

    let assunto_id = null;
    if (assunto_name) {
      const { findOrCreateAssunto } = require('./assuntos');
      const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
      assunto_id = assunto.id;
    }

    const result = await db.query(
      `INSERT INTO flashcards
       (discipline_id, creator_id, type, word, expected_answer, 
        answer_type, difficulty_level, scheduled_date, assunto_id, idioma)
       VALUES ($1, $2, 'reading', $3, $4, 'audio', $5, $6, $7, $8)
       RETURNING *`,
      [discipline_id, creator_id, word, expected_answer, 
       difficulty_level || 1, scheduled_date, assunto_id, idioma]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar flashcard reading:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar flashcard'
    });
  }
};

/**
 * Criar flashcard SPELLING (soletrar)
 */
const criarFlashcardSpelling = async (req, res) => {
  try {
    const {
      discipline_id,
      audio_text, // Palavra que será convertida em áudio
      expected_answer, // Palavra soletrada, ex: "p a t o"
      scheduled_date,
      assunto_name,
      difficulty_level,
      idioma = 'pt'
    } = req.body;

    const creator_id = req.user.id;

    if (!discipline_id || !audio_text || !expected_answer) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id, audio_text e expected_answer são obrigatórios'
      });
    }

    let assunto_id = null;
    if (assunto_name) {
      const { findOrCreateAssunto } = require('./assuntos');
      const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
      assunto_id = assunto.id;
    }

    const result = await db.query(
      `INSERT INTO flashcards
       (discipline_id, creator_id, type, audio_text, expected_answer, 
        answer_type, difficulty_level, scheduled_date, assunto_id, idioma)
       VALUES ($1, $2, 'spelling', $3, $4, 'audio', $5, $6, $7, $8)
       RETURNING *`,
      [discipline_id, creator_id, audio_text, expected_answer, 
       difficulty_level || 1, scheduled_date, assunto_id, idioma]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar flashcard spelling:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar flashcard'
    });
  }
};


// ============================================
// GERAR ÁUDIO (TTS)
// ============================================

/**
 * Gerar áudio para flashcard usando serviço Python
 */
/**
 * Gerar áudio para flashcards que precisam de TTS (dictation, audio_question)
 */
const gerarAudioFlashcard = async (req, res) => {
  try {
    const { flashcard_id } = req.params;

    // Buscar o flashcard na DB
    const result = await db.query(
      `SELECT audio_text, type, idioma 
       FROM flashcards 
       WHERE id = $1 
         AND type IN ('dictation', 'audio_question')`,
      [flashcard_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard não encontrado ou tipo inválido'
      });
    }

    const flashcard = result.rows[0];
    const textToConvert = flashcard.audio_text;

    if (!textToConvert || textToConvert.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Texto para conversão em áudio não definido'
      });
    }

    // Chamar o serviço Python para gerar/cached o TTS
    const response = await axios.post(`${AUDIO_SERVICE_URL}/tts/generate`, {
      text: textToConvert,
      language: flashcard.idioma
    });

    // IMPORTANTE: Devolver URL que passa pelo proxy do Nginx
    // O serviço Python devolve /audio/hash.mp3
    // O Nginx torna isso acessível em /audio/hash.mp3
    const publicAudioUrl = `/audio/${response.data.text_hash}.mp3`;

    res.json({
      success: true,
      audio_url: publicAudioUrl,        // ← URL pública acessível pelo navegador
      text_hash: response.data.text_hash,
      cached: response.data.cached
    });

  } catch (error) {
    console.error('Erro ao gerar áudio:', error.message || error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar áudio'
    });
  }
};
// ============================================
// VALIDAR RESPOSTAS
// ============================================

/**
 * Validar resposta em TEXTO (para dictation)
 */
const validarRespostaTexto = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { flashcard_id, student_text, time_spent } = req.body;
    const student_id = req.user.id;

    // Buscar flashcard
    const flashcardRes = await client.query(
      'SELECT * FROM flashcards WHERE id = $1',
      [flashcard_id]
    );

    if (flashcardRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard não encontrado'
      });
    }

    const flashcard = flashcardRes.rows[0];
    const expected_text = flashcard.expected_answer;

    // Validar com serviço Python (apenas comparação de texto)
    const validationRes = await axios.post(
      `${AUDIO_SERVICE_URL}/validate-text`,
      new URLSearchParams({
        student_text,
        expected_text,
        threshold: '80'
      })
    );

    const { is_correct, similarity_score } = validationRes.data;

    // Guardar tentativa
    await client.query(
      `INSERT INTO audio_flashcard_attempts
       (student_id, flashcard_id, attempt_type, student_text_input,
        expected_text, is_correct, similarity_score, time_spent_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [student_id, flashcard_id, flashcard.type, student_text,
       expected_text, is_correct, similarity_score, time_spent || 0]
    );

    // Calcular rating baseado na similaridade
    let rating;
    if (similarity_score >= 95) rating = 4; // Easy
    else if (similarity_score >= 85) rating = 3; // Good
    else if (similarity_score >= 70) rating = 2; // Hard
    else rating = 1; // Again

    // Atualizar FSRS
    await atualizarFSRS(client, student_id, flashcard_id, null, rating);

    await client.query('COMMIT');

    res.json({
      success: true,
      is_correct,
      similarity_score,
      rating,
      expected_text
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao validar resposta texto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao validar resposta'
    });
  } finally {
    client.release();
  }
};

/**
 * Validar resposta em ÁUDIO (para phonetic, reading, audio_question)
 */
const validarRespostaAudio = async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');

    const { flashcard_id, phoneme_index, time_spent } = req.body;
    const student_id = req.user.id;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({
        success: false,
        message: 'Ficheiro de áudio não fornecido'
      });
    }

    // Buscar flashcard
    const flashcardRes = await client.query(
      'SELECT * FROM flashcards WHERE id = $1',
      [flashcard_id]
    );

    if (flashcardRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard não encontrado'
      });
    }

    const flashcard = flashcardRes.rows[0];
    
    // Determinar texto esperado
    let expected_text;
    if (flashcard.type === 'phonetic' && phoneme_index !== undefined) {
      const phonemes = flashcard.phonemes;
      expected_text = phonemes[phoneme_index]?.text;
    } else {
      expected_text = flashcard.expected_answer;
    }

    // Enviar áudio para serviço Python
    const formData = new FormData();
    formData.append('audio', audioFile.buffer, {
      filename: 'recording.webm',
      contentType: audioFile.mimetype
    });
    formData.append('expected_text', expected_text);
    formData.append('language', flashcard.idioma);
    formData.append('threshold', '80');

    const validationRes = await axios.post(
      `${AUDIO_SERVICE_URL}/stt/transcribe-and-validate`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    const { 
      transcription, 
      is_correct, 
      similarity_score, 
      confidence_score 
    } = validationRes.data;

    // Guardar tentativa
    await client.query(
      `INSERT INTO audio_flashcard_attempts
       (student_id, flashcard_id, attempt_type, phoneme_index,
        student_audio_transcription, expected_text, is_correct,
        similarity_score, confidence_score, time_spent_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        student_id, flashcard_id, flashcard.type, phoneme_index || null,
        transcription, expected_text, is_correct, similarity_score,
        confidence_score, time_spent || 0
      ]
    );

    // Calcular rating
    let rating;
    if (similarity_score >= 95) rating = 4;
    else if (similarity_score >= 85) rating = 3;
    else if (similarity_score >= 70) rating = 2;
    else rating = 1;

    // Atualizar FSRS (apenas quando completa o flashcard)
    const shouldUpdateFSRS = 
      flashcard.type !== 'phonetic' || 
      (phoneme_index !== undefined && phoneme_index === flashcard.phonemes.length - 1);

    if (shouldUpdateFSRS) {
      await atualizarFSRS(client, student_id, flashcard_id, null, rating);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      transcription,
      is_correct,
      similarity_score,
      confidence_score,
      rating,
      expected_text
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao validar resposta áudio:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao validar resposta'
    });
  } finally {
    client.release();
  }
};

/**
 * Atualizar estado FSRS
 */
const atualizarFSRS = async (client, student_id, flashcard_id, sub_id, rating) => {
  const now = new Date();

  const stateRes = await client.query(
    `SELECT difficulty, stability, last_review, reps, lapses
     FROM flashcard_memory_state
     WHERE student_id = $1 AND flashcard_id = $2 
       AND (sub_id = $3 OR (sub_id IS NULL AND $3 IS NULL))`,
    [student_id, flashcard_id, sub_id || null]
  );

  const currentState = stateRes.rows[0] || null;
  const nextState = scheduler.next(currentState, now, rating);

  if (currentState) {
    await client.query(
      `UPDATE flashcard_memory_state
       SET difficulty = $1, stability = $2, last_review = $3, 
           reps = $4, lapses = $5, updated_at = NOW()
       WHERE student_id = $6 AND flashcard_id = $7 
         AND (sub_id = $8 OR (sub_id IS NULL AND $8 IS NULL))`,
      [
        nextState.card.difficulty, nextState.card.stability, now,
        nextState.card.reps, nextState.card.lapses,
        student_id, flashcard_id, sub_id || null
      ]
    );
  } else {
    await client.query(
      `INSERT INTO flashcard_memory_state
       (student_id, flashcard_id, sub_id, difficulty, stability, 
        last_review, reps, lapses)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        student_id, flashcard_id, sub_id || null,
        nextState.card.difficulty, nextState.card.stability, now,
        nextState.card.reps, nextState.card.lapses
      ]
    );
  }

  await client.query(
    `INSERT INTO flashcard_review_log
     (student_id, flashcard_id, sub_id, rating, review_date, elapsed_days)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      student_id, flashcard_id, sub_id || null, rating, now,
      nextState.review_log?.elapsed_days || 0
    ]
  );
};

// ============================================
// ANALYTICS
// ============================================

/**
 * Obter analytics de áudio para um aluno
 */
const getAudioAnalytics = async (req, res) => {
  try {
    const { student_id, discipline_id, attempt_type } = req.query;
    const userId = student_id || req.user.id;

    let query = `
      SELECT 
        afa.attempt_type,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN afa.is_correct THEN 1 ELSE 0 END) as correct_attempts,
        ROUND(AVG(afa.similarity_score), 2) as avg_similarity,
        ROUND(AVG(afa.confidence_score) * 100, 2) as avg_confidence
      FROM audio_flashcard_attempts afa
      JOIN flashcards f ON f.id = afa.flashcard_id
      WHERE afa.student_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (discipline_id) {
      query += ` AND f.discipline_id = $${paramIndex}`;
      params.push(discipline_id);
      paramIndex++;
    }

    if (attempt_type) {
      query += ` AND afa.attempt_type = $${paramIndex}`;
      params.push(attempt_type);
    }

    query += ` GROUP BY afa.attempt_type ORDER BY afa.attempt_type`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Erro ao obter analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter analytics'
    });
  }
};

const getAudioFlashcardQueue = async (req, res) => {
  try {
    const student_id = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = `
      WITH user_disciplines AS (
        SELECT dt.disciplina_id
        FROM aluno_disciplina ad
        JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
        WHERE ad.aluno_id = $1
      )
      SELECT
        f.id as flashcard_id,
        f.type,
        f.word,
        f.phonemes,
        f.audio_text,
        f.expected_answer,
        f.answer_type,
        f.difficulty_level,
        f.idioma,
        s.nome as discipline_name,
        COALESCE(ms.stability, 0) AS stability,
        ms.last_review,
        ms.reps,
        ms.lapses
      FROM flashcards f
      JOIN subjects s ON f.discipline_id = s.id
      LEFT JOIN flashcard_memory_state ms
        ON ms.flashcard_id = f.id
        AND ms.student_id = $1
      WHERE
        f.discipline_id IN (SELECT disciplina_id FROM user_disciplines)
        AND (
          ms.stability IS NULL OR ms.stability = 0 OR ms.last_review IS NULL
          OR (
            ms.last_review IS NOT NULL
            AND ms.stability > 0
            AND $2::date >= (ms.last_review::date + CEIL(ms.stability)::integer)
          )
        )
      ORDER BY RANDOM()
      LIMIT 20;
    `;

    const result = await db.query(query, [student_id, today]);

    const cards = result.rows.map(row => ({
      flashcard_id: row.flashcard_id,
      type: row.type,
      word: row.word,
      phonemes: row.phonemes,
      audio_text: row.audio_text,
      expected_answer: row.expected_answer,
      answer_type: row.answer_type,
      difficulty_level: row.difficulty_level,
      idioma: row.idioma,
      discipline_name: row.discipline_name,
    }));

    res.json({
      success: true,
      data: {
        total: cards.length,
        cards
      }
    });
  } catch (error) {
    console.error('Error getting audio flashcard queue:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading daily audio review'
    });
  }
};

module.exports = {
  upload,
  criarFlashcardPhonetic,
  criarFlashcardDictation,
  criarFlashcardAudioQuestion,
  criarFlashcardReading,
  criarFlashcardSpelling,
  gerarAudioFlashcard,
  validarRespostaTexto,
  validarRespostaAudio,
  getAudioAnalytics,
  getAudioFlashcardQueue,
};
