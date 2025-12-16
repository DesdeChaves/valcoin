// libs/memoria/memoria.controller.js

const db = require('../db');
const { MemoriaScheduler } = require('./memoria.scheduler');
const { findOrCreateAssunto, getAssuntosByDisciplina } = require('./assuntos');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');


/**
 * Scheduler FSRS global (podes mais tarde personalizar por aluno ou escola)
 */
const scheduler = new MemoriaScheduler();

/**
 * Criar um novo flashcard
 * POST /api/memoria/flashcards
 */
const criarFlashcard = async (req, res) => {
  try {
    const {
      discipline_id,
      type = 'basic',
      front,
      back,
      cloze_text,
      image_url,
      occlusion_data,
      hints = [],
      scheduled_date,
      assunto_name, // New field
    } = req.body;

    const creator_id = req.user.id;

    // Validações básicas
    if (!discipline_id || !scheduled_date) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id e scheduled_date são obrigatórios'
      });
    }

    if (!['basic', 'cloze', 'image_occlusion'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type deve ser "basic", "cloze" ou "image_occlusion"'
      });
    }

    // Validação específica por tipo
    if (type === 'basic') {
      if (!front || !back) {
        return res.status(400).json({
          success: false,
          message: 'front e back são obrigatórios para tipo basic'
        });
      }
    } else if (type === 'cloze') {
      if (!cloze_text || !/{{c\d+::.*?}}/.test(cloze_text)) {
        return res.status(400).json({
          success: false,
          message: 'cloze_text deve conter pelo menos uma lacuna no formato {{c1::resposta}}'
        });
      }
    } else if (type === 'image_occlusion') {
      if (!image_url || !occlusion_data || !Array.isArray(occlusion_data) || occlusion_data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'image_url e occlusion_data (array não vazio) são obrigatórios para image_occlusion'
        });
      }
      // Validação básica das masks
      for (const mask of occlusion_data) {
        if (!mask.mask_id || !mask.label || !mask.shape || !Array.isArray(mask.coords)) {
          return res.status(400).json({
            success: false,
            message: 'Cada mask deve ter mask_id, label, shape e coords'
          });
        }
      }
    }

    let assunto_id = null;
    if (assunto_name) {
        const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
        assunto_id = assunto.id;
    }

    const result = await db.query(
      `INSERT INTO flashcards 
       (discipline_id, creator_id, type, front, back, cloze_text, image_url, occlusion_data, hints, scheduled_date, assunto_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, type, front, back, cloze_text, image_url, occlusion_data, hints, scheduled_date, created_at, assunto_id`,
      [
        discipline_id,
        creator_id,
        type,
        type === 'basic' ? front : null,
        type === 'basic' ? back : null,
        type === 'cloze' ? cloze_text : null,
        type === 'image_occlusion' ? image_url : null,
        type === 'image_occlusion' ? JSON.stringify(occlusion_data) : null,
        hints,
        scheduled_date,
        assunto_id,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar flashcard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao criar flashcard'
    });
  }
};

/**
 * Listar flashcards criados pelo professor
 * GET /api/memoria/flashcards?discipline_id=uuid
 */
const listarFlashcardsProfessor = async (req, res) => {
  try {
    const professor_id = req.user.id;
    const { discipline_id } = req.query;

    let query = `
      SELECT 
        f.id, f.type, f.front, f.back, f.cloze_text, f.image_url, 
        f.occlusion_data, f.hints, f.scheduled_date, f.active, f.created_at,
        f.discipline_id,
        s.nome as discipline_name,
        a.name as assunto_name
      FROM flashcards f
      JOIN subjects s ON s.id = f.discipline_id
      LEFT JOIN assuntos a ON a.id = f.assunto_id
      WHERE f.creator_id = $1 AND f.active = true
    `;
    const params = [professor_id];

    if (discipline_id) {
      query += ` AND f.discipline_id = $2`;
      params.push(discipline_id);
    }

    query += ` ORDER BY f.scheduled_date DESC, f.created_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Erro ao listar flashcards do professor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar flashcards'
    });
  }
};


const editarFlashcard = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            discipline_id,
            type,
            front,
            back,
            cloze_text,
            image_url,
            occlusion_data,
            hints,
            scheduled_date,
            assunto_name,
        } = req.body;

        let assunto_id = null;
        if (assunto_name) {
            const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
            assunto_id = assunto.id;
        }

        const result = await db.query(
            `UPDATE flashcards SET
                type = $1,
                front = $2,
                back = $3,
                cloze_text = $4,
                image_url = $5,
                occlusion_data = $6,
                hints = $7,
                scheduled_date = $8,
                assunto_id = $9,
                updated_at = NOW()
            WHERE id = $10
            RETURNING *`,
            [
                type,
                type === 'basic' ? front : null,
                type === 'basic' ? back : null,
                type === 'cloze' ? cloze_text : null,
                type === 'image_occlusion' ? image_url : null,
                type === 'image_occlusion' ? JSON.stringify(occlusion_data) : null,
                hints,
                scheduled_date,
                assunto_id,
                id
            ]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao editar flashcard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao editar flashcard'
        });
    }
};

const apagarFlashcard = async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('DELETE FROM flashcards WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Flashcard apagado com sucesso'
        });

    } catch (error) {
        console.error('Erro ao apagar flashcard:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao apagar flashcard'
        });
    }
};

const getAssuntos = async (req, res) => {
    try {
        const { discipline_id } = req.params;
        const assuntos = await getAssuntosByDisciplina(discipline_id);
        res.json({
            success: true,
            data: assuntos
        });
    } catch (error) {
        console.error('Erro ao obter assuntos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter assuntos'
        });
    }
};

/**
 * Obter fila diária de revisão para o aluno
 * GET /api/memoria/fila-diaria
 */
const obterFilaDiaria = async (req, res) => {
  try {
    const student_id = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query simplificada e corrigida
    const query = `
      WITH base_flashcards AS (
        -- Seleciona todos os flashcards ativos e agendados
        SELECT
          f.id AS flashcard_id,
          f.type,
          f.front,
          f.back,
          f.cloze_text,
          f.image_url,
          f.occlusion_data,
          f.hints
        FROM flashcards f
        WHERE f.active = true 
          AND f.scheduled_date <= CURRENT_DATE
      ),
      expanded_flashcards AS (
        -- Expande cloze e image_occlusion em sub-cards
        SELECT
          bf.flashcard_id,
          bf.type,
          bf.front,
          bf.back,
          bf.cloze_text,
          bf.image_url,
          bf.hints,
          CASE
            -- Para basic, não há sub_id
            WHEN bf.type = 'basic' THEN NULL
            -- Para image_occlusion, usa o mask_id do occlusion_data
            WHEN bf.type = 'image_occlusion' THEN 
              (elem->>'mask_id')::text
            -- Para cloze, extrai os números das lacunas
            WHEN bf.type = 'cloze' THEN 
              cloze_match.cloze_num::text
            ELSE NULL
          END AS sub_id,
          CASE
            WHEN bf.type = 'image_occlusion' THEN elem->>'label'
            WHEN bf.type = 'cloze' THEN cloze_match.cloze_text
            ELSE NULL
          END AS sub_label,
          CASE
            WHEN bf.type = 'image_occlusion' THEN elem
            ELSE NULL
          END AS sub_data
        FROM base_flashcards bf
        -- Para image_occlusion: expande cada elemento do array occlusion_data
        LEFT JOIN LATERAL jsonb_array_elements(bf.occlusion_data) AS elem
          ON bf.type = 'image_occlusion'
        -- Para cloze: extrai cada lacuna {{cN::texto}}
        LEFT JOIN LATERAL (
          SELECT 
            match[1] AS cloze_num,
            match[2] AS cloze_text
          FROM regexp_matches(bf.cloze_text, '\\{\\{c(\\d+)::(.*?)\\}\\}', 'g') AS match
        ) AS cloze_match
          ON bf.type = 'cloze'
        -- Garante que basic cards aparecem (sem sub_id)
        WHERE bf.type = 'basic' 
           OR (bf.type = 'image_occlusion' AND elem IS NOT NULL)
           OR (bf.type = 'cloze' AND cloze_match.cloze_num IS NOT NULL)
      )
      SELECT
        ef.flashcard_id,
        ef.type,
        ef.front,
        ef.back,
        ef.cloze_text,
        ef.image_url,
        ef.hints,
        ef.sub_id,
        ef.sub_label,
        ef.sub_data,
        COALESCE(ms.stability, 0) AS stability,
        ms.last_review,
        ms.reps,
        ms.lapses
      FROM expanded_flashcards ef
      LEFT JOIN flashcard_memory_state ms
        ON ms.flashcard_id = ef.flashcard_id
        AND ms.student_id = $1
        AND (
          (ef.type = 'basic' AND ms.sub_id IS NULL)
          OR (ef.type IN ('cloze', 'image_occlusion') AND ms.sub_id = ef.sub_id)
        )
      WHERE
        -- Novos cards ou nunca revistos
        ms.stability IS NULL 
        OR ms.stability = 0 
        OR ms.last_review IS NULL
        -- Ou cards que já passaram do intervalo
        OR (
          ms.last_review IS NOT NULL 
          AND ms.stability > 0
          AND $2::date >= (ms.last_review::date + CEIL(ms.stability)::integer)
        )
      ORDER BY RANDOM()
      LIMIT 50;
    `;

    const result = await db.query(query, [student_id, today]);

    // Formatar resposta para frontend
    const cards = result.rows.map(row => ({
      flashcard_id: row.flashcard_id,
      type: row.type,
      front: row.front,
      back: row.back,
      cloze_text: row.cloze_text,
      image_url: row.image_url,
      hints: row.hints,
      sub_id: row.sub_id,
      sub_label: row.sub_label,
      sub_data: row.sub_data,
      stability: row.stability,
      last_review: row.last_review,
      is_due: true
    }));

    res.json({
      success: true,
      data: {
        total: cards.length,
        cards
      }
    });

  } catch (error) {
    console.error('Erro ao obter fila diária:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar revisão diária'
    });
  }
};

/**
 * Registar revisão de um flashcard
 * POST /api/memoria/revisao
 * Body: { flashcard_id: uuid, sub_id: string|null, rating: 1-4 }
 */
const registarRevisao = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { flashcard_id, sub_id, rating, time_spent } = req.body;

    const student_id = req.user.id;
    const now = new Date();

    if (![1, 2, 3, 4].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: 'rating deve ser 1 (Again), 2 (Hard), 3 (Good) ou 4 (Easy)'
      });
    }

    // Buscar estado atual
    const stateRes = await client.query(
      `SELECT difficulty, stability, last_review, reps, lapses 
       FROM flashcard_memory_state 
       WHERE student_id = $1 AND flashcard_id = $2 AND (sub_id = $3 OR (sub_id IS NULL AND $3 IS NULL))`,
      [student_id, flashcard_id, sub_id || null]
    );

    const currentState = stateRes.rows[0] || null;

    // Debug log
    console.log('[DEBUG] Current state:', currentState);
    console.log('[DEBUG] Rating:', rating);
    console.log('[DEBUG] Review date:', now);

    // Calcular próximo estado com FSRS
    let nextState;
    try {
      nextState = scheduler.next(currentState, now, rating);
      console.log('[DEBUG] Next state calculated:', nextState);
    } catch (schedulerError) {
      console.error('[ERROR] Scheduler error:', schedulerError);
      throw new Error(`Erro no scheduler FSRS: ${schedulerError.message}`);
    }

    // Upsert no estado de memória
    if (currentState) {
      await client.query(
        `UPDATE flashcard_memory_state 
         SET difficulty = $1, stability = $2, last_review = $3, reps = $4, lapses = $5, updated_at = NOW()
         WHERE student_id = $6 AND flashcard_id = $7 AND (sub_id = $8 OR (sub_id IS NULL AND $8 IS NULL))`,
        [
          nextState.card.difficulty,
          nextState.card.stability,
          now,
          nextState.card.reps,
          nextState.card.lapses,
          student_id,
          flashcard_id,
          sub_id || null
        ]
      );
    } else {
      await client.query(
        `INSERT INTO flashcard_memory_state 
         (student_id, flashcard_id, sub_id, difficulty, stability, last_review, reps, lapses)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          student_id,
          flashcard_id,
          sub_id || null,
          nextState.card.difficulty,
          nextState.card.stability,
          now,
          nextState.card.reps,
          nextState.card.lapses
        ]
      );
    }

    // Log da revisão
    await client.query(
      `INSERT INTO flashcard_review_log 
       (student_id, flashcard_id, sub_id, rating, review_date, elapsed_days, time_spent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        student_id,
        flashcard_id,
        sub_id || null,
        rating,
        now,
        nextState.review_log.elapsed_days || 0,
        time_spent // New parameter
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: {
        next_review: nextState.next_due_date,
        interval_days: nextState.next_interval_days,
        difficulty: nextState.card.difficulty,
        stability: nextState.card.stability
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registar revisão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registar revisão'
    });
  } finally {
    client.release();
  }
};

/**
 * Obter percentis de tempo de revisão para um flashcard específico
 * GET /api/memoria/flashcards/:id/review-times-percentiles
 */
const getFlashcardReviewTimePercentiles = async (req, res) => {
  try {
    const { id } = req.params; // flashcard_id
    const DEFAULT_MIN_TIME = 10; // seconds
    const DEFAULT_MAX_TIME = 60; // seconds

    // Get time_spent values for the flashcard
    const result = await db.query(
      `SELECT time_spent FROM flashcard_review_log WHERE flashcard_id = $1 AND time_spent IS NOT NULL`,
      [id]
    );

    const times = result.rows.map(row => row.time_spent).sort((a, b) => a - b);

    if (times.length < 5) { // Need at least 5 data points to calculate meaningful percentiles
      return res.json({
        success: true,
        data: {
          min_time_seconds: DEFAULT_MIN_TIME,
          max_time_seconds: DEFAULT_MAX_TIME,
          reason: 'Not enough data for percentiles, returning defaults.'
        }
      });
    }

    // Calculate percentiles
    // Function to get percentile value from sorted array
    const getPercentile = (arr, percentile) => {
      if (arr.length === 0) return null;
      const index = (percentile / 100) * (arr.length - 1);
      if (index === Math.floor(index)) {
        return arr[index];
      }
      const lower = arr[Math.floor(index)];
      const upper = arr[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    };

    const p25 = Math.round(getPercentile(times, 25));
    const p75 = Math.round(getPercentile(times, 75));

    res.json({
      success: true,
      data: {
        min_time_seconds: Math.max(DEFAULT_MIN_TIME, p25), // Ensure min is at least default
        max_time_seconds: Math.max(DEFAULT_MIN_TIME, p75), // Ensure max is at least default and above min
      }
    });

  } catch (error) {
    console.error('Erro ao obter percentis de tempo de revisão:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter percentis de tempo de revisão'
    });
  }
};

/**
 * Upload de imagem para flashcards
 * POST /api/memoria/upload-image
 */
const uploadImage = async (req, res) => {
  try {
    let imageBuffer;
    let originalFilename;

    if (req.file) {
      // Se a imagem foi enviada por upload
      imageBuffer = req.file.buffer;
      originalFilename = req.file.originalname;
    } else if (req.body.url) {
      // Se a imagem foi enviada por URL
      const response = await axios({
        url: req.body.url,
        responseType: 'arraybuffer'
      });
      imageBuffer = response.data;
      originalFilename = path.basename(req.body.url);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Nenhuma imagem ou URL fornecida.' 
      });
    }

    // Gera um nome de ficheiro único com a extensão .webp
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
    const filepath = path.join('uploads', filename);

    // Redimensiona a imagem e converte para webp
    await sharp(imageBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Retorna o caminho público da imagem
    res.json({
      success: true,
      path: `/memoria/images/${filename}`
    });

  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao processar a imagem.' 
    });
  }
};

const getProfessorAnalytics = async (req, res) => {
  try {
    const { discipline_id } = req.params;
    const professor_id = req.user.id;

    // Total Flashcards
    const totalFlashcardsRes = await db.query(
      `SELECT COUNT(id) FROM flashcards
       WHERE creator_id = $1 AND discipline_id = $2;`,
      [professor_id, discipline_id]
    );
    const totalFlashcards = parseInt(totalFlashcardsRes.rows[0].count, 10);

    // Total Reviews
    const totalReviewsRes = await db.query(
      `SELECT COUNT(frl.id) FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2;`,
      [professor_id, discipline_id]
    );
    const totalReviews = parseInt(totalReviewsRes.rows[0].count, 10);

    // Average Rating
    const averageRatingRes = await db.query(
      `SELECT AVG(frl.rating) FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2;`,
      [professor_id, discipline_id]
    );
    const averageRating = parseFloat(averageRatingRes.rows[0].avg || 0);

    // Rating Distribution
    const ratingDistributionRes = await db.query(
      `SELECT rating, COUNT(frl.id) as count FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY rating ORDER BY rating;`,
      [professor_id, discipline_id]
    );
    const ratingDistribution = ratingDistributionRes.rows.reduce((acc, row) => {
      let label = '';
      if (row.rating === 1) label = 'again';
      else if (row.rating === 2) label = 'hard';
      else if (row.rating === 3) label = 'good';
      else if (row.rating === 4) label = 'easy';
      acc[label] = parseInt(row.count, 10);
      return acc;
    }, { again: 0, hard: 0, good: 0, easy: 0 });


    // Flashcards by Subject
    const flashcardsBySubjectRes = await db.query(
      `SELECT a.name as assunto_name, COUNT(f.id) as count
       FROM flashcards f
       JOIN assuntos a ON f.assunto_id = a.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY a.name ORDER BY count DESC;`,
      [professor_id, discipline_id]
    );
    const flashcardsBySubject = flashcardsBySubjectRes.rows.map(row => ({
      name: row.assunto_name,
      count: parseInt(row.count, 10)
    }));

    // Reviews by Subject
    const reviewsBySubjectRes = await db.query(
      `SELECT a.name as assunto_name, COUNT(frl.id) as count
       FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       JOIN assuntos a ON f.assunto_id = a.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY a.name ORDER BY count DESC;`,
      [professor_id, discipline_id]
    );
    const reviewsBySubject = reviewsBySubjectRes.rows.map(row => ({
      name: row.assunto_name,
      count: parseInt(row.count, 10)
    }));


const getProfessorAnalytics = async (req, res) => {
  try {
    const { discipline_id } = req.params;
    const professor_id = req.user.id;

    // Helper to determine student status
    const getStudentStatus = (avgRating, avgDifficulty, totalLapses, totalReviews) => {
      if (totalReviews === 0) return 'inactive';
      if (avgRating >= 3.5 && avgDifficulty < 6 && totalLapses <= 1) return 'excellent';
      if (avgRating >= 2.5 && avgDifficulty < 8 && totalLapses <= 2) return 'good';
      return 'struggling';
    };

    // Total Flashcards
    const totalFlashcardsRes = await db.query(
      `SELECT COUNT(id) FROM flashcards
       WHERE creator_id = $1 AND discipline_id = $2;`,
      [professor_id, discipline_id]
    );
    const totalFlashcards = parseInt(totalFlashcardsRes.rows[0].count, 10);

    // Total Reviews
    const totalReviewsRes = await db.query(
      `SELECT COUNT(frl.id) FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2;`,
      [professor_id, discipline_id]
    );
    const totalReviews = parseInt(totalReviewsRes.rows[0].count, 10);

    // Average Rating
    const averageRatingRes = await db.query(
      `SELECT AVG(frl.rating) FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2;`,
      [professor_id, discipline_id]
    );
    const averageRating = parseFloat(averageRatingRes.rows[0].avg || 0);

    // Rating Distribution
    const ratingDistributionRes = await db.query(
      `SELECT rating, COUNT(frl.id) as count FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY rating ORDER BY rating;`,
      [professor_id, discipline_id]
    );
    const ratingDistribution = ratingDistributionRes.rows.reduce((acc, row) => {
      let label = '';
      if (row.rating === 1) label = 'again';
      else if (row.rating === 2) label = 'hard';
      else if (row.rating === 3) label = 'good';
      else if (row.rating === 4) label = 'easy';
      acc[label] = parseInt(row.count, 10);
      return acc;
    }, { again: 0, hard: 0, good: 0, easy: 0 });


    // Flashcards by Subject
    const flashcardsBySubjectRes = await db.query(
      `SELECT a.name as assunto_name, COUNT(f.id) as count
       FROM flashcards f
       JOIN assuntos a ON f.assunto_id = a.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY a.name ORDER BY count DESC;`,
      [professor_id, discipline_id]
    );
    const flashcardsBySubject = flashcardsBySubjectRes.rows.map(row => ({
      name: row.assunto_name,
      count: parseInt(row.count, 10)
    }));

    // Reviews by Subject
    const reviewsBySubjectRes = await db.query(
      `SELECT a.name as assunto_name, COUNT(frl.id) as count
       FROM flashcard_review_log frl
       JOIN flashcards f ON frl.flashcard_id = f.id
       JOIN assuntos a ON f.assunto_id = a.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY a.name ORDER BY count DESC;`,
      [professor_id, discipline_id]
    );
    const reviewsBySubject = reviewsBySubjectRes.rows.map(row => ({
      name: row.assunto_name,
      count: parseInt(row.count, 10)
    }));

    // Student Analysis
    const studentAnalysisRes = await db.query(
        `SELECT
            u.id AS student_id,
            u.nome AS student_name,
            u.numero_mecanografico AS student_numero,
            COUNT(frl.id) AS total_reviews,
            COALESCE(AVG(frl.rating), 0) AS avg_rating,
            COALESCE(AVG(fms.difficulty), 0) AS avg_difficulty,
            COALESCE(AVG(fms.stability), 0) AS avg_stability,
            COUNT(CASE WHEN frl.rating = 1 THEN 1 ELSE NULL END) AS total_lapses,
            COALESCE(AVG(frl.time_spent), 0) AS avg_time_spent
        FROM users u
        LEFT JOIN (
            SELECT frl.*
            FROM flashcard_review_log frl
            JOIN flashcards f ON frl.flashcard_id = f.id
            WHERE f.creator_id = $1 AND f.discipline_id = $2
        ) frl ON u.id = frl.student_id
        LEFT JOIN (
            SELECT fms.*
            FROM flashcard_memory_state fms
            JOIN flashcards f ON fms.flashcard_id = f.id
            WHERE f.creator_id = $1 AND f.discipline_id = $2
        ) fms ON u.id = fms.student_id AND frl.flashcard_id = fms.flashcard_id AND (frl.sub_id = fms.sub_id OR (frl.sub_id IS NULL AND fms.sub_id IS NULL))
        WHERE u.tipo_utilizador = 'ALUNO'
          AND EXISTS (SELECT 1 FROM aluno_disciplina ad JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id WHERE ad.aluno_id = u.id AND dt.disciplina_id = $2)
        GROUP BY u.id, u.nome, u.numero_mecanografico
        HAVING COUNT(frl.id) > 0;`,
        [professor_id, discipline_id]
    );

    const studentAnalysis = studentAnalysisRes.rows.map(row => ({
        id: row.student_id,
        name: row.student_name,
        numero: row.student_numero,
        totalReviews: parseInt(row.total_reviews, 10),
        avgRating: parseFloat(row.avg_rating).toFixed(2),
        avgDifficulty: parseFloat(row.avg_difficulty).toFixed(2),
        avgStability: parseFloat(row.avg_stability).toFixed(0),
        totalLapses: parseInt(row.total_lapses, 10),
        avgTimeSpent: parseFloat(row.avg_time_spent).toFixed(0),
        status: getStudentStatus(parseFloat(row.avg_rating), parseFloat(row.avg_difficulty), parseInt(row.total_lapses, 10), parseInt(row.total_reviews, 10)),
    }));

    // Subject Analysis
    const assuntoAnalysisRes = await db.query(
        `SELECT
            a.id AS assunto_id,
            a.name AS assunto_name,
            COUNT(frl.id) AS total_reviews,
            COALESCE(AVG(frl.rating), 0) AS avg_rating,
            COALESCE(AVG(fms.difficulty), 0) AS avg_difficulty,
            COUNT(DISTINCT CASE WHEN frl.rating = 1 THEN frl.student_id ELSE NULL END) AS struggling_students_count
        FROM assuntos a
        JOIN flashcards f ON a.id = f.assunto_id
        LEFT JOIN flashcard_review_log frl ON f.id = frl.flashcard_id
        LEFT JOIN flashcard_memory_state fms ON f.id = fms.flashcard_id AND (frl.student_id = fms.student_id OR frl.student_id IS NULL) AND (frl.sub_id = fms.sub_id OR (frl.sub_id IS NULL AND fms.sub_id IS NULL))
        WHERE f.creator_id = $1 AND f.discipline_id = $2
        GROUP BY a.id, a.name
        HAVING COUNT(frl.id) > 0;`,
        [professor_id, discipline_id]
    );

    const assuntoAnalysis = assuntoAnalysisRes.rows.map(row => ({
        id: row.assunto_id,
        name: row.assunto_name,
        totalReviews: parseInt(row.total_reviews, 10),
        avgRating: parseFloat(row.avg_rating).toFixed(2),
        avgDifficulty: parseFloat(row.avg_difficulty).toFixed(2),
        strugglingStudents: parseInt(row.struggling_students_count, 10),
    }));


    res.json({
      success: true,
      data: {
        totalFlashcards,
        totalReviews,
        averageRating,
        ratingDistribution,
        flashcardsBySubject,
        reviewsBySubject,
        studentAnalysis, // New data
        assuntoAnalysis, // New data
      }
    });

  } catch (error) {
    console.error('Erro ao obter analíticas do professor:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter analíticas do professor'
    });
  }
};


module.exports = {
  criarFlashcard,
  listarFlashcardsProfessor,
  obterFilaDiaria,
  registarRevisao,
  uploadImage,
  getFlashcardReviewTimePercentiles,
  getAssuntos,
  editarFlashcard,
  apagarFlashcard,
  getProfessorAnalytics,
};
