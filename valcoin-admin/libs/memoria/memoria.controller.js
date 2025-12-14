// libs/memoria/memoria.controller.js

const db = require('../db'); // o mesmo db.js usado no resto do projeto
const { MemoriaScheduler } = require('./memoria.scheduler');

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
      scheduled_date
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

    const result = await db.query(
      `INSERT INTO flashcards 
       (discipline_id, creator_id, type, front, back, cloze_text, image_url, occlusion_data, hints, scheduled_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, type, front, back, cloze_text, image_url, occlusion_data, hints, scheduled_date, created_at`,
      [
        discipline_id,
        creator_id,
        type,
        type === 'basic' ? front : null,
        type === 'basic' ? back : null,
        type === 'cloze' ? cloze_text : null,
        type === 'image_occlusion' ? image_url : null,
        type === 'image_occlusion' ? occlusion_data : null,
        hints,
        scheduled_date
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
        s.nome as discipline_name
      FROM flashcards f
      JOIN subjects s ON s.id = f.discipline_id
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

/**
 * Obter fila diária de revisão para o aluno
 * GET /api/memoria/fila-diaria
 */
const obterFilaDiaria = async (req, res) => {
  try {
    const student_id = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query complexa: junta flashcards ativos + estado de memória + gera sub-cards para cloze/IO
    const query = `
      WITH available_cards AS (
        SELECT 
          f.id AS base_id,
          f.type,
          f.front, f.back, f.cloze_text, f.image_url, f.occlusion_data, f.hints,
          COALESCE(ms.stability, 0) AS stability,
          ms.last_review,
          ms.sub_id,
          jsonb_array_elements(
            CASE 
              WHEN f.type = 'image_occlusion' AND f.occlusion_data IS NOT NULL 
              THEN f.occlusion_data
              WHEN f.type = 'cloze' AND f.cloze_text IS NOT NULL 
              THEN (
                SELECT jsonb_agg(
                  jsonb_build_object('mask_id', idx, 'label', regexp_match(cloze_part, '{{c' || idx || '::(.*?) }}') [1])
                )
                FROM regexp_matches(f.cloze_text, '{{c(\\d+)::(.*?) }}', 'g') WITH ORDINALITY AS t(match, idx)
                ORDER BY idx
              )
              ELSE '[]'::jsonb
            END
          ) AS sub_item
        FROM flashcards f
        LEFT JOIN flashcard_memory_state ms 
          ON ms.flashcard_id = f.id 
          AND ms.student_id = $1
          AND (ms.sub_id IS NULL OR ms.sub_id = (
            CASE WHEN f.type IN ('cloze', 'image_occlusion') THEN ms.sub_id ELSE NULL END
          ))
        WHERE f.active = true
          AND f.scheduled_date <= CURRENT_DATE
      )
      SELECT 
        base_id AS flashcard_id,
        type,
        front, back, cloze_text, image_url, hints,
        stability,
        last_review,
        sub_id,
        sub_item->>'mask_id' AS sub_mask_id,
        sub_item->>'label' AS sub_label,
        sub_item AS sub_data
      FROM available_cards
      WHERE 
        stability = 0 -- novo card
        OR last_review IS NULL
        OR (
          last_review IS NOT NULL 
          AND $2::date >= (last_review::date + CEIL(stability)::integer)
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
      sub_id: row.sub_id || row.sub_mask_id || null,
      sub_label: row.sub_label || null,
      sub_data: row.sub_data || null,
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

    const { flashcard_id, sub_id, rating } = req.body;
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
       WHERE student_id = $1 AND flashcard_id = $2 AND sub_id = $3`,
      [student_id, flashcard_id, sub_id || null]
    );

    const currentState = stateRes.rows[0] || null;

    // Calcular próximo estado com FSRS
    const nextState = scheduler.next(currentState, now, rating);

    // Upsert no estado de memória
    if (currentState) {
      await client.query(
        `UPDATE flashcard_memory_state 
         SET difficulty = $1, stability = $2, last_review = $3, reps = $4, lapses = $5, updated_at = NOW()
         WHERE student_id = $6 AND flashcard_id = $7 AND sub_id = $8`,
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
       (student_id, flashcard_id, sub_id, rating, review_date, elapsed_days)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        student_id,
        flashcard_id,
        sub_id || null,
        rating,
        now,
        nextState.review_log.elapsed_days
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

module.exports = {
  criarFlashcard,
  listarFlashcardsProfessor,
  obterFilaDiaria,
  registarRevisao
};
