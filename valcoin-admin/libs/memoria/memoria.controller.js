// libs/memoria/memoria.controller.js

const db = require('../db');
const { MemoriaScheduler } = require('./memoria.scheduler');
const { findOrCreateAssunto, getAssuntosByDisciplina } = require('./assuntos');
const { parseCSV, processCSVData } = require('./memoria.csv');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

/**
 * Scheduler FSRS global
 */
const scheduler = new MemoriaScheduler();

const _criarFlashcard = async (flashcardData, creator_id) => {
    const {
        discipline_id,
        type = 'basic',
        front,
        back,
        cloze_text,
        image_url,
        back_image_url,
        occlusion_data,
        hints = [],
        scheduled_date,
        assunto_name,
    } = flashcardData;

    if (!discipline_id || !scheduled_date) {
        throw new Error('discipline_id e scheduled_date são obrigatórios');
    }

    if (!['basic', 'cloze', 'image_occlusion', 'image_text', 'roda'].includes(type)) {
        throw new Error('type deve ser "basic", "cloze", "image_occlusion", "image_text" ou "roda"');
    }

    if (type === 'basic' && (!front || !back)) {
        throw new Error('front e back são obrigatórios para tipo basic');
    } else if (type === 'cloze') {
        const clozeRegex = /{{\s*c(\d+)::(.*?)\s*}}/g;
        if (!cloze_text || !clozeRegex.test(cloze_text)) {
            throw new Error('cloze_text deve conter pelo menos uma lacuna no formato {{c1::resposta}}');
        }
    } else if (type === 'image_occlusion') {
        if (!image_url || !occlusion_data || !Array.isArray(occlusion_data) || occlusion_data.length === 0) {
            throw new Error('image_url e occlusion_data (array não vazio) são obrigatórios para image_occlusion');
        }
        for (const mask of occlusion_data) {
            if (!mask.mask_id || !mask.label || !mask.shape || !Array.isArray(mask.coords)) {
                throw new Error('Cada mask deve ter mask_id, label, shape e coords');
            }
        }
    } else if (type === 'image_text' && (!front || !back)) {
        throw new Error('front e back são obrigatórios para tipo image_text');
    }

    let assunto_id = null;
    if (assunto_name) {
        const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
        assunto_id = assunto.id;
    }

    const result = await db.query(
        `INSERT INTO public.flashcards
       (discipline_id, creator_id, type, front, back, cloze_text, image_url, back_image_url, occlusion_data, hints, scheduled_date, assunto_id, roda_pergunta, roda_resposta, roda_resposta_opcional)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, type, front, back, cloze_text, image_url, back_image_url, occlusion_data, hints, scheduled_date, created_at, assunto_id, roda_pergunta, roda_resposta, roda_resposta_opcional`,
        [
            discipline_id,
            creator_id,
            type,
            (type === 'basic' || type === 'image_text' || type === 'roda') ? front : null,
            (type === 'basic' || type === 'image_text') ? back : null,
            type === 'cloze' ? cloze_text : null,
            (type === 'image_occlusion' || type === 'image_text') ? image_url : null,
            type === 'image_text' ? back_image_url : null,
            type === 'image_occlusion' ? JSON.stringify(occlusion_data) : null,
            hints,
            scheduled_date,
            assunto_id,
            type === 'roda' ? flashcardData.roda_pergunta : null,
            type === 'roda' ? flashcardData.roda_resposta : null,
            type === 'roda' ? flashcardData.roda_resposta_opcional : null,
        ]
    );

    return result.rows[0];
};


/**
 * Criar um novo flashcard
 */
const criarFlashcard = async (req, res) => {
  try {
    const flashcard = await _criarFlashcard(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: flashcard
    });
  } catch (error) {
    console.error('Erro ao criar flashcard:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao criar flashcard'
    });
  }
};

const importarFlashcardsCSV = async (req, res) => {
    console.log('Request body for CSV import:', req.body); // Debug log
    try {
        const { discipline_id, assunto_name } = req.body;
        const creator_id = req.user.id;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum ficheiro CSV enviado'
            });
        }

        if (!discipline_id) {
            return res.status(400).json({
                success: false,
                message: 'discipline_id é obrigatório'
            });
        }

        const csvData = await parseCSV(req.file.buffer);
        const flashcardsData = processCSVData(csvData);

        let createdCount = 0;

        console.log(`[CSV_IMPORT] Found ${flashcardsData.length} flashcards to import for discipline ${discipline_id}`);

        for (const data of flashcardsData) {
            const flashcard = {
                ...data,
                discipline_id,
                assunto_name: data.assunto_name || assunto_name, // Prioritize CSV assunto, fallback to body
                type: 'basic',
            };
            await _criarFlashcard(flashcard, creator_id);
            createdCount++;
        }

        res.status(201).json({
            success: true,
            message: `${createdCount} flashcards importados com sucesso`
        });

    } catch (error) {
        console.error('Erro ao importar flashcards de CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao importar flashcards'
        });
    }
};

/**
 * Listar flashcards criados pelo professor
 */
const listarFlashcardsProfessor = async (req, res) => {
  console.log('[MEMORIA_CONTROLLER] listarFlashcardsProfessor called'); // Log
  try {
    const professor_id = req.user.id;
    const { discipline_id } = req.query; // discipline_id of the currently selected discipline

    let query = `
      SELECT DISTINCT f.id, f.type, f.front, f.back, f.cloze_text, f.image_url, f.back_image_url,
        f.occlusion_data, f.hints, f.scheduled_date, f.active, f.created_at,
        f.discipline_id, f.roda_pergunta, f.roda_resposta, f.roda_resposta_opcional,
        s.nome as discipline_name,
        COALESCE(a.name, 'Sem assunto') as assunto_name
      FROM public.flashcards f
      JOIN public.subjects s ON s.id = f.discipline_id
      LEFT JOIN public.assuntos a ON a.id = f.assunto_id
      WHERE f.creator_id = $1 AND f.active = true
    `;
    const params = [professor_id];

    if (discipline_id) {
      // If a specific discipline is selected, retrieve flashcards either originally created for it
      // OR explicitly shared with it by the current professor.
      query = `
        SELECT
          f.id, f.type, f.front, f.back, f.cloze_text, f.image_url, f.back_image_url,
          f.occlusion_data, f.hints, f.scheduled_date, f.active, f.created_at,
          f.discipline_id,
          f.roda_pergunta,
          f.roda_resposta,
          f.roda_resposta_opcional,
          s.nome as discipline_name,
          COALESCE(a.name, 'Sem assunto') as assunto_name
        FROM public.flashcards f
        JOIN public.subjects s ON s.id = f.discipline_id
        LEFT JOIN public.assuntos a ON a.id = f.assunto_id
        WHERE f.creator_id = $1 AND f.active = true AND f.discipline_id = $2
        
        UNION
        
        SELECT
          f.id, f.type, f.front, f.back, f.cloze_text, f.image_url, f.back_image_url,
          f.occlusion_data, f.hints, f.scheduled_date, f.active, f.created_at,
          f.discipline_id, f.roda_pergunta, f.roda_resposta, f.roda_resposta_opcional,
          s.nome as discipline_name,
          COALESCE(a.name, 'Sem assunto') as assunto_name
        FROM public.flashcards f
        JOIN public.subjects s ON s.id = f.discipline_id
        JOIN public.flashcard_disciplinas fd ON f.id = fd.flashcard_id
        LEFT JOIN public.assuntos a ON a.id = f.assunto_id
        WHERE f.creator_id = $1 AND f.active = true AND fd.disciplina_id = $2
      `;
      params.push(discipline_id);
    } 

    query += ` ORDER BY scheduled_date DESC, created_at DESC`;

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
 * Editar flashcard
 */
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
      back_image_url,
      occlusion_data,
      hints,
      scheduled_date,
      assunto_name,
      roda_pergunta,
      roda_resposta,
      roda_resposta_opcional,
    } = req.body;

    if (!['basic', 'cloze', 'image_occlusion', 'image_text', 'roda'].includes(type)) {
        throw new Error('type deve ser "basic", "cloze", "image_occlusion", "image_text" ou "roda"');
    }

    let assunto_id = null;
    if (assunto_name) {
      const assunto = await findOrCreateAssunto(assunto_name, discipline_id);
      assunto_id = assunto.id;
    }

    const result = await db.query(
      `UPDATE public.flashcards SET
          type = $1,
          front = $2,
          back = $3,
          cloze_text = $4,
          image_url = $5,
          back_image_url = $6,
          occlusion_data = $7,
          hints = $8,
          scheduled_date = $9,
          assunto_id = $10,
          roda_pergunta = $11,
          roda_resposta = $12,
          roda_resposta_opcional = $13,
          updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        type,
        (type === 'basic' || type === 'image_text' || type === 'roda') ? front : null,
        (type === 'basic' || type === 'image_text') ? back : null,
        type === 'cloze' ? cloze_text : null,
        (type === 'image_occlusion' || type === 'image_text') ? image_url : null,
        type === 'image_text' ? back_image_url : null,
        type === 'image_occlusion' ? JSON.stringify(occlusion_data) : null,
        hints,
        scheduled_date,
        assunto_id,
        type === 'roda' ? roda_pergunta : null,
        type === 'roda' ? roda_resposta : null,
        type === 'roda' ? roda_resposta_opcional : null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard não encontrado'
      });
    }

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

/**
 * Apagar flashcard
 */
const apagarFlashcard = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Delete associated review requests first
    await client.query('DELETE FROM public.pedidos_revisao_flashcard WHERE flashcard_id = $1', [id]);

    // Delete associated quiz questions
    await client.query('DELETE FROM public.quiz_questions WHERE flashcard_id = $1', [id]);

    // Then delete the flashcard
    await client.query('DELETE FROM public.flashcards WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Flashcard apagado com sucesso'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao apagar flashcard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao apagar flashcard'
    });
  } finally {
    client.release();
  }
};

/**
 * Obter assuntos de uma disciplina
 */
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
 * Obter fila diária
 */
const obterFilaDiaria = async (req, res) => {
  console.log(`[MEMORIA_LOG] Entering obterFilaDiaria for student_id: ${req.user.id}, user_type: ${req.user.tipo_utilizador}`);
  const { discipline_id: filter_discipline_id } = req.query;
  
  try {
    const student_id = req.user.id;
    const user_type = req.user.tipo_utilizador;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let disciplineQuery = '';
    if (user_type === 'ALUNO') {
      disciplineQuery = `
        SELECT dt.disciplina_id as discipline_id
        FROM public.aluno_disciplina ad
        JOIN public.disciplina_turma dt ON ad.disciplina_turma_id = dt.id
        WHERE ad.aluno_id = $1 AND ad.ativo = TRUE
      `;
    } else if (user_type === 'EXTERNO') {
      disciplineQuery = `
        SELECT eud.discipline_id
        FROM public.external_user_disciplines eud
        WHERE eud.user_id = $1 AND eud.ativo = TRUE
      `;
    } else {
      return res.status(403).json({ success: false, message: 'O seu tipo de utilizador não tem acesso à fila diária de flashcards.' });
    }

    const queryParams = [student_id, today];

    let filterCondition = '';
    if (filter_discipline_id) {
      filterCondition = ` AND ef.effective_discipline_id = $3`;
      queryParams.push(filter_discipline_id);
    }

    const query = `
      WITH user_disciplines AS (${disciplineQuery}),
      disciplinas_ativas AS (
        SELECT DISTINCT discipline_id 
        FROM user_disciplines
        WHERE discipline_id IS NOT NULL
      ),
      all_relevant_flashcards AS (
        -- Flashcards whose main discipline is one of the user's
        SELECT
          f.id AS flashcard_id, f.type, f.front, f.back, f.cloze_text, f.image_url,
          f.hints, s.nome as original_discipline_name, f.occlusion_data, f.scheduled_date, 
          f.discipline_id as original_discipline_id,
          f.roda_pergunta, f.roda_resposta, f.roda_resposta_opcional,
          f.discipline_id as effective_discipline_id
        FROM public.flashcards f
        JOIN public.subjects s ON f.discipline_id = s.id
        WHERE f.active = true
          AND f.scheduled_date <= CURRENT_DATE
          AND f.discipline_id IN (SELECT discipline_id FROM disciplinas_ativas)
        
        UNION ALL
        
        -- Flashcards shared with one of the user's disciplines
        SELECT
          f.id AS flashcard_id, f.type, f.front, f.back, f.cloze_text, f.image_url,
          f.hints, os.nome as original_discipline_name, f.occlusion_data, f.scheduled_date, 
          f.discipline_id as original_discipline_id,
          f.roda_pergunta, f.roda_resposta, f.roda_resposta_opcional,
          fd.disciplina_id as effective_discipline_id
        FROM public.flashcards f
        JOIN public.subjects os ON f.discipline_id = os.id
        JOIN public.flashcard_disciplinas fd ON f.id = fd.flashcard_id
        WHERE f.active = true
          AND f.scheduled_date <= CURRENT_DATE
          AND fd.disciplina_id IN (SELECT discipline_id FROM disciplinas_ativas)
      ),
      flashcards_with_effective_names AS (
        SELECT
          arf.*,
          es.nome as effective_discipline_name
        FROM all_relevant_flashcards arf
        JOIN public.subjects es ON arf.effective_discipline_id = es.id
      ),
      expanded_flashcards AS (
        -- Basic e Image+Text cards (sem sub_id)
        SELECT
          fwen.flashcard_id,
          fwen.type,
          fwen.front,
          fwen.back,
          fwen.cloze_text,
          fwen.image_url,
          fwen.hints,
          fwen.effective_discipline_name as discipline_name,
          fwen.roda_pergunta,
          fwen.roda_resposta,
          fwen.roda_resposta_opcional,
          NULL::text AS sub_id,
          NULL::text AS sub_label,
          NULL::jsonb AS sub_data,
          fwen.effective_discipline_id
        FROM flashcards_with_effective_names fwen
        WHERE fwen.type IN ('basic', 'image_text', 'roda')
        
        UNION ALL

        -- Image occlusion cards (com sub_id = mask_id)
        SELECT
          fwen.flashcard_id,
          fwen.type,
          fwen.front,
          fwen.back,
          fwen.cloze_text,
          fwen.image_url,
          fwen.hints,
          fwen.effective_discipline_name as discipline_name,
          NULL::text AS roda_pergunta,
          NULL::text AS roda_resposta,
          NULL::text AS roda_resposta_opcional,
          (elem->>'mask_id')::text AS sub_id,
          elem->>'label' AS sub_label,
          elem AS sub_data,
          fwen.effective_discipline_id
        FROM flashcards_with_effective_names fwen
        CROSS JOIN LATERAL jsonb_array_elements(fwen.occlusion_data) AS elem
        WHERE fwen.type = 'image_occlusion'

        UNION ALL

        -- Cloze cards (com sub_id = número da lacuna)
        SELECT
          fwen.flashcard_id,
          fwen.type,
          fwen.front,
          fwen.back,
          fwen.cloze_text,
          fwen.image_url,
          fwen.hints,
          fwen.effective_discipline_name as discipline_name,
          NULL::text AS roda_pergunta,
          NULL::text AS roda_resposta,
          NULL::text AS roda_resposta_opcional,
          match[1]::text AS sub_id,
          match[2]::text AS sub_label,
          NULL::jsonb AS sub_data,
          fwen.effective_discipline_id
        FROM flashcards_with_effective_names fwen
        CROSS JOIN LATERAL regexp_matches(fwen.cloze_text, '\{\{c(\d+)::([^}]+)\}\}', 'g') AS match
        WHERE fwen.type = 'cloze'
      )
      SELECT
        ef.flashcard_id,
        ef.type,
        ef.front,
        ef.back,
        ef.cloze_text,
        ef.image_url,
        ef.hints,
        ef.discipline_name,
        ef.roda_pergunta,
        ef.roda_resposta,
        ef.roda_resposta_opcional,
        ef.sub_id,
        ef.sub_label,
        ef.sub_data,
        ef.effective_discipline_id,
        COALESCE(ms.stability, 0) AS stability,
        ms.last_review,
        ms.reps,
        ms.lapses
      FROM expanded_flashcards ef
      LEFT JOIN public.flashcard_memory_state ms
        ON ms.flashcard_id = ef.flashcard_id
        AND ms.student_id = $1
        AND (
          (ef.type IN ('basic', 'image_text', 'roda') AND ms.sub_id IS NULL)
          OR (ef.type IN ('cloze', 'image_occlusion') AND ms.sub_id = ef.sub_id)
        )
      WHERE
        (
          -- Card nunca foi revisto
          ms.stability IS NULL 
          OR ms.stability = 0 
          OR ms.last_review IS NULL
          OR (
            -- Card foi revisto, mas a próxima revisão é hoje ou anterior
            ms.last_review IS NOT NULL
            AND ms.stability > 0
            AND $2::date >= (ms.last_review::date + CEIL(ms.stability)::integer)
          )
        )
        -- NOVA CONDIÇÃO: Excluir cards já revistos HOJE
        AND (ms.last_review IS NULL OR ms.last_review::date < $2::date)
        ${filterCondition}
      ORDER BY RANDOM()
      LIMIT 50;
    `;

    console.log(`[MEMORIA_LOG] Executing obterFilaDiaria query for student_id: ${student_id} with filter_discipline_id: ${filter_discipline_id}`);
    const result = await db.query(query, queryParams);
    console.log(`[MEMORIA_LOG] Query completed for student_id: ${student_id}. Found ${result.rowCount} rows.`);

    const cards = result.rows.map(row => ({
      flashcard_id: row.flashcard_id,
      type: row.type,
      front: row.front,
      back: row.back,
      cloze_text: row.cloze_text,
      image_url: row.image_url,
      hints: row.hints,
      discipline_name: row.discipline_name,
      roda_pergunta: row.roda_pergunta,
      roda_resposta: row.roda_resposta,
      roda_resposta_opcional: row.roda_resposta_opcional,
      sub_id: row.sub_id,
      sub_label: row.sub_label,
      sub_data: row.sub_data,
      effective_discipline_id: row.effective_discipline_id
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
 * Registar revisão
 */
const registarRevisao = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { flashcard_id, sub_id, rating, time_spent = 0 } = req.body;
    const student_id = req.user.id;
    const now = new Date();

    if (![1, 2, 3, 4].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: 'rating deve ser 1 (Again), 2 (Hard), 3 (Good) ou 4 (Easy)'
      });
    }

    const stateRes = await client.query(
      `SELECT difficulty, stability, last_review, reps, lapses
       FROM public.flashcard_memory_state
       WHERE student_id = $1 AND flashcard_id = $2 AND (sub_id = $3 OR (sub_id IS NULL AND $3 IS NULL))`,
      [student_id, flashcard_id, sub_id || null]
    );

    const currentState = stateRes.rows[0] || null;

    const nextState = scheduler.next(currentState, now, rating);

    if (currentState) {
      await client.query(
        `UPDATE public.flashcard_memory_state
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
        `INSERT INTO public.flashcard_memory_state
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

    await client.query(
      `INSERT INTO public.flashcard_review_log
       (student_id, flashcard_id, sub_id, rating, review_date, elapsed_days, time_spent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        student_id,
        flashcard_id,
        sub_id || null,
        rating,
        now,
        nextState.review_log?.elapsed_days || 0,
        time_spent
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
 * Percentis de tempo de revisão
 */
const getFlashcardReviewTimePercentiles = async (req, res) => {
  try {
    const { id } = req.params;
    const DEFAULT_MIN_TIME = 10;
    const DEFAULT_MAX_TIME = 60;

    const result = await db.query(
      `SELECT time_spent FROM public.flashcard_review_log WHERE flashcard_id = $1 AND time_spent IS NOT NULL`,
      [id]
    );

    const times = result.rows.map(row => row.time_spent).sort((a, b) => a - b);

    if (times.length < 5) {
      return res.json({
        success: true,
        data: {
          min_time_seconds: DEFAULT_MIN_TIME,
          max_time_seconds: DEFAULT_MAX_TIME
        }
      });
    }

    const getPercentile = (arr, p) => {
      const index = (p / 100) * (arr.length - 1);
      if (index === Math.floor(index)) return arr[index];
      const lower = arr[Math.ceil(index)];
      const upper = arr[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    };

    const p25 = Math.round(getPercentile(times, 25));
    const p75 = Math.round(getPercentile(times, 75));

    res.json({
      success: true,
      data: {
        min_time_seconds: Math.max(DEFAULT_MIN_TIME, p25),
        max_time_seconds: Math.max(DEFAULT_MAX_TIME, p75)
      }
    });
  } catch (error) {
    console.error('Erro ao obter percentis:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter percentis'
    });
  }
};

/**
 * Upload de imagem
 */
const uploadImage = async (req, res) => {
  try {
    let imageBuffer;
    let originalFilename;

    if (req.file) {
      imageBuffer = req.file.buffer;
      originalFilename = req.file.originalname;
    } else if (req.body.url) {
      const response = await axios({ url: req.body.url, responseType: 'arraybuffer' });
      imageBuffer = response.data;
      originalFilename = path.basename(req.body.url);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma imagem ou URL fornecida.'
      });
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
    const filepath = path.join('uploads', filename);

    await sharp(imageBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

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

/**
 * Analíticas do professor por disciplina
 */
const getProfessorAnalytics = async (req, res) => {
  try {
    const { discipline_id } = req.params;
    const professor_id = req.user.id;

    const getStudentStatus = (avgRating, avgDifficulty, totalLapses, totalReviews) => {
      if (totalReviews === 0) return 'inactive';
      if (avgRating >= 3.5 && avgDifficulty < 6 && totalLapses <= 1) return 'excellent';
      if (avgRating >= 2.5 && avgDifficulty < 8 && totalLapses <= 2) return 'good';
      return 'struggling';
    };

    // Total Flashcards
    const totalFlashcardsRes = await db.query(
      `SELECT COUNT(id) FROM public.flashcards WHERE creator_id = $1 AND discipline_id = $2`,
      [professor_id, discipline_id]
    );
    const totalFlashcards = parseInt(totalFlashcardsRes.rows[0].count, 10);

    // Total Reviews
    const totalReviewsRes = await db.query(
      `SELECT COUNT(frl.id) FROM public.flashcard_review_log frl
       JOIN public.flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2`,
      [professor_id, discipline_id]
    );
    const totalReviews = parseInt(totalReviewsRes.rows[0].count, 10);

    // Average Rating
    const averageRatingRes = await db.query(
      `SELECT AVG(frl.rating) FROM public.flashcard_review_log frl
       JOIN public.flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2`,
      [professor_id, discipline_id]
    );
    const averageRating = parseFloat(averageRatingRes.rows[0].avg || 0);

    // Rating Distribution
    const ratingDistributionRes = await db.query(
      `SELECT rating, COUNT(frl.id) as count FROM public.flashcard_review_log frl
       JOIN public.flashcards f ON frl.flashcard_id = f.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY rating ORDER BY rating`,
      [professor_id, discipline_id]
    );
    const ratingDistribution = ratingDistributionRes.rows.reduce((acc, row) => {
      const labels = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' };
      acc[labels[row.rating] || 'unknown'] = parseInt(row.count, 10);
      return acc;
    }, { again: 0, hard: 0, good: 0, easy: 0 });

    // Flashcards e Reviews por Assunto
    const flashcardsBySubjectRes = await db.query(
      `SELECT a.name as assunto_name, COUNT(f.id) as count
       FROM public.assuntos a
       JOIN public.flashcards f ON a.id = f.assunto_id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY a.name ORDER BY count DESC`,
      [professor_id, discipline_id]
    );
    const flashcardsBySubject = flashcardsBySubjectRes.rows.map(row => ({
      name: row.assunto_name,
      count: parseInt(row.count, 10)
    }));

    const reviewsBySubjectRes = await db.query(
      `SELECT a.name as assunto_name, COUNT(frl.id) as count
       FROM public.flashcard_review_log frl
       JOIN public.flashcards f ON frl.flashcard_id = f.id
       JOIN public.assuntos a ON f.assunto_id = a.id
       WHERE f.creator_id = $1 AND f.discipline_id = $2
       GROUP BY a.name ORDER BY count DESC`,
      [professor_id, discipline_id]
    );
    const reviewsBySubject = reviewsBySubjectRes.rows.map(row => ({
      name: row.assunto_name,
      count: parseInt(row.count, 10)
    }));

    // Análise por Aluno
    const studentAnalysisRes = await db.query(
      `SELECT
          u.id AS student_id,
          u.nome AS student_name,
          u.numero_mecanografico AS student_numero,
          COUNT(frl.id) AS total_reviews,
          MAX(frl.review_date) as last_review_date,
          COALESCE(AVG(frl.rating), 0) AS avg_rating,
          COALESCE(AVG(fms.difficulty), 0) AS avg_difficulty,
          COALESCE(AVG(fms.stability), 0) AS avg_stability,
          COUNT(CASE WHEN frl.rating = 1 THEN 1 ELSE NULL END) AS total_lapses,
          COALESCE(AVG(frl.time_spent), 0) AS avg_time_spent
        FROM public.users u
        LEFT JOIN (
            SELECT frl.*
            FROM public.flashcard_review_log frl
            JOIN public.flashcards f ON frl.flashcard_id = f.id
            WHERE f.creator_id = $1 AND f.discipline_id = $2
        ) frl ON u.id = frl.student_id
        LEFT JOIN (
            SELECT fms.*
            FROM public.flashcard_memory_state fms
            JOIN public.flashcards f ON fms.flashcard_id = f.id
            WHERE f.creator_id = $1 AND f.discipline_id = $2
        ) fms ON u.id = fms.student_id AND frl.flashcard_id = fms.flashcard_id AND (frl.sub_id = fms.sub_id OR (frl.sub_id IS NULL AND fms.sub_id IS NULL))
        WHERE u.tipo_utilizador = 'ALUNO'
          AND EXISTS (SELECT 1 FROM public.aluno_disciplina ad JOIN public.disciplina_turma dt ON ad.disciplina_turma_id = dt.id WHERE ad.aluno_id = u.id AND dt.disciplina_id = $2)
        GROUP BY u.id, u.nome, u.numero_mecanografico
        HAVING COUNT(frl.id) > 0
        ORDER BY total_reviews DESC`,
      [professor_id, discipline_id]
    );

    const studentAnalysis = studentAnalysisRes.rows.map(row => ({
      id: row.student_id,
      name: row.student_name,
      numero: row.student_numero,
      totalReviews: parseInt(row.total_reviews, 10),
      last_review_date: row.last_review_date,
      avgRating: parseFloat(row.avg_rating).toFixed(2),
      avgDifficulty: parseFloat(row.avg_difficulty).toFixed(2),
      avgStability: parseFloat(row.avg_stability).toFixed(0),
      totalLapses: parseInt(row.total_lapses, 10),
      avgTimeSpent: parseFloat(row.avg_time_spent).toFixed(0),
      status: getStudentStatus(parseFloat(row.avg_rating), parseFloat(row.avg_difficulty), parseInt(row.total_lapses, 10), parseInt(row.total_reviews, 10))
    }));

    // Análise por Assunto
    const assuntoAnalysisRes = await db.query(
      `SELECT
          a.id AS assunto_id,
          a.name AS assunto_name,
          COUNT(frl.id) AS total_reviews,
          COALESCE(AVG(frl.rating), 0) AS avg_rating,
          COALESCE(AVG(fms.difficulty), 0) AS avg_difficulty,
          COUNT(DISTINCT CASE WHEN frl.rating = 1 THEN frl.student_id ELSE NULL END) AS struggling_students_count
        FROM public.assuntos a
        JOIN public.flashcards f ON a.id = f.assunto_id
        LEFT JOIN public.flashcard_review_log frl ON f.id = frl.flashcard_id
        LEFT JOIN public.flashcard_memory_state fms ON f.id = fms.flashcard_id AND (frl.student_id = fms.student_id OR frl.student_id IS NULL) AND (frl.sub_id = fms.sub_id OR (frl.sub_id IS NULL AND fms.sub_id IS NULL))
        WHERE f.creator_id = $1 AND f.discipline_id = $2
        GROUP BY a.id, a.name
        HAVING COUNT(frl.id) > 0`,
      [professor_id, discipline_id]
    );

    const assuntoAnalysis = assuntoAnalysisRes.rows.map(row => ({
      id: row.assunto_id,
      name: row.assunto_name,
      totalReviews: parseInt(row.total_reviews, 10),
      avgRating: parseFloat(row.avg_rating).toFixed(2),
      avgDifficulty: parseFloat(row.avg_difficulty).toFixed(2),
      strugglingStudents: parseInt(row.struggling_students_count, 10)
    }));

    res.json({
      success: true,
      data: {
        totalFlashcards,
        totalReviews,
        averageRating: parseFloat(averageRating.toFixed(2)),
        ratingDistribution,
        flashcardsBySubject,
        reviewsBySubject,
        studentAnalysis,
        assuntoAnalysis
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

const getProfessorDisciplines = async (req, res) => {
    console.log('[MEMORIA_CONTROLLER] getProfessorDisciplines called'); // Log
    try {
        const professor_id = req.user.id;
        const result = await db.query(`
      SELECT DISTINCT d.id, d.nome
      FROM public.disciplina_turma dt
      JOIN public.subjects d ON dt.disciplina_id = d.id
      WHERE dt.professor_id = $1 AND dt.ativo = true
      ORDER BY d.nome;
    `, [professor_id]);

        res.json({
            success: true,
            data: result.rows,
        });
    } catch (error) {
        console.error('Erro ao obter disciplinas do professor:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar as suas disciplinas',
        });
    }
};

const getStudentEnrolledDisciplines = async (req, res) => {
  console.log('[MEMORIA_CONTROLLER] getStudentEnrolledDisciplines called'); // Existing log
  const student_id = req.user.id;
  console.log(`[MEMORIA_CONTROLLER] getStudentEnrolledDisciplines - student_id from req.user: ${student_id}`); // New log

  try {
    const query = `
      SELECT DISTINCT s.id, s.nome, s.codigo
      FROM public.aluno_disciplina ad
      JOIN public.disciplina_turma dt ON ad.disciplina_turma_id = dt.id
      JOIN public.subjects s ON dt.disciplina_id = s.id
      WHERE ad.aluno_id = $1 AND ad.ativo = TRUE AND dt.ativo = TRUE AND s.ativo = TRUE
      ORDER BY s.nome;
    `;
    console.log(`[MEMORIA_CONTROLLER] getStudentEnrolledDisciplines - Executing query: ${query} with param: ${student_id}`); // New log with query and param

    const result = await db.query(query, [student_id]);
    console.log(`[MEMORIA_CONTROLLER] getStudentEnrolledDisciplines returning ${result.rows.length} disciplines for student_id: ${student_id}`); // Existing log
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erro ao obter disciplinas inscritas do aluno:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar disciplinas inscritas.'
    });
  }
};

const requestFlashcardReview = async (req, res) => {
  try {
    const { flashcard_id, motivo } = req.body;
    const aluno_id = req.user.id;

    if (!flashcard_id || !motivo) {
      return res.status(400).json({
        success: false,
        message: 'flashcard_id e motivo são obrigatórios',
      });
    }

    await db.query(
      `INSERT INTO public.pedidos_revisao_flashcard (flashcard_id, aluno_id, motivo)
       VALUES ($1, $2, $3)`,
      [flashcard_id, aluno_id, motivo]
    );

    res.status(201).json({
      success: true,
      message: 'Pedido de revisão de flashcard registado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao registar pedido de revisão de flashcard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao registar pedido de revisão de flashcard',
    });
  }
};


const getSharedDisciplines = async (req, res) => {
    console.log('[MEMORIA_CONTROLLER] getSharedDisciplines called'); // Log
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT disciplina_id FROM public.flashcard_disciplinas WHERE flashcard_id = $1',
            [id]
        );
        res.json({
            success: true,
            data: result.rows.map(row => row.disciplina_id),
        });
    } catch (error) {
        console.error('Erro ao obter disciplinas partilhadas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter disciplinas partilhadas',
        });
    }
};


const shareFlashcard = async (req, res) => {
    console.log('[MEMORIA_CONTROLLER] shareFlashcard called'); // Log
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id: flashcard_id } = req.params;
        const { disciplina_ids } = req.body;
        const professor_id = req.user.id;

        if (!Array.isArray(disciplina_ids)) {
            return res.status(400).json({
                success: false,
                message: 'disciplina_ids deve ser um array.',
            });
        }

        // Verify professor teaches the target disciplines
        if (disciplina_ids.length > 0) {
            const taughtDisciplinesCheck = await client.query(
                `SELECT COUNT(DISTINCT dt.disciplina_id) as count
         FROM public.disciplina_turma dt
         WHERE dt.professor_id = $1 AND dt.disciplina_id = ANY($2::uuid[])`, // Corrected to uuid[]
                [professor_id, disciplina_ids]
            );

            if (parseInt(taughtDisciplinesCheck.rows[0].count, 10) !== disciplina_ids.length) {
                return res.status(403).json({
                    success: false,
                    message: 'Não pode partilhar com uma disciplina que não leciona.',
                });
            }
        }


        // Clear existing shares
        await client.query('DELETE FROM public.flashcard_disciplinas WHERE flashcard_id = $1', [flashcard_id]);

        // Insert new shares
        if (disciplina_ids.length > 0) {
            const insertQuery = 'INSERT INTO public.flashcard_disciplinas (flashcard_id, disciplina_id) VALUES ' + 
                disciplina_ids.map((_, i) => `($1, $${i + 2})`).join(',');

            await client.query(insertQuery, [flashcard_id, ...disciplina_ids]);
        }


        await client.query('COMMIT');
        res.json({
            success: true,
            message: 'Flashcard partilhado com sucesso!',
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao partilhar flashcard:', error);
        res.status(500).json({
            success: false,
            message: 'Ocorreu um erro ao partilhar o flashcard.',
        });
    } finally {
        client.release();
    }
};

const getFlashcardReviewRequests = async (req, res) => {
    try {
      const result = await db.query(
        `SELECT
           pr.id,
           pr.motivo,
           pr.data_pedido,
           u.nome as aluno_nome,
           f.front as flashcard_front,
           f.id as flashcard_id
         FROM public.pedidos_revisao_flashcard pr
         JOIN public.users u ON pr.aluno_id = u.id
         JOIN public.flashcards f ON pr.flashcard_id = f.id
         WHERE pr.estado = 'pendente'
         ORDER BY pr.data_pedido ASC`
      );
  
      res.json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      console.error('Erro ao obter pedidos de revisão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter pedidos de revisão',
      });
    }
  };

  const updateFlashcardReviewRequest = async (req, res) => {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const professor_id = req.user.id;
  
      if (!['resolvido', 'inativado'].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado inválido. Use "resolvido" ou "inativado".',
        });
      }
  
      const result = await db.query(
        `UPDATE public.pedidos_revisao_flashcard
         SET estado = $1, professor_id = $2, data_atendimento = NOW()
         WHERE id = $3
         RETURNING *`,
        [estado, professor_id, id]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pedido de revisão não encontrado',
        });
      }
  
      res.json({
        success: true,
        message: 'Pedido de revisão atualizado com sucesso',
        data: result.rows[0],
      });
    } catch (error) {
      console.error('Erro ao atualizar pedido de revisão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar pedido de revisão',
      });
    }
  };

module.exports = {
  criarFlashcard,
  importarFlashcardsCSV,
  listarFlashcardsProfessor,
  obterFilaDiaria,
  registarRevisao,
  uploadImage,
  getFlashcardReviewTimePercentiles,
  getAssuntos,
  editarFlashcard,
  apagarFlashcard,
  getProfessorAnalytics,
  shareFlashcard,
  getSharedDisciplines,
  getProfessorDisciplines,
  getStudentEnrolledDisciplines, // Export new function
  requestFlashcardReview,
  getFlashcardReviewRequests,
  updateFlashcardReviewRequest
};

