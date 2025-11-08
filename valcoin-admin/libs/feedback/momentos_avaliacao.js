const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ==================== MOMENTOS DE AVALIAÇÃO CRUD ====================

/**
 * POST /api/momento-avaliacao/save
 * Cria um novo momento de avaliação
 */
router.post('/momento-avaliacao/save', async (req, res, next) => {
  try {
    const { nome, dossie_id } = req.body;
    const userId = req.user.id;

    if (!nome || !dossie_id) {
      return res.status(400).json({ error: 'Validation error', details: 'nome and dossie_id are required' });
    }

    // Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.id 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [dossie_id, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or dossie not active' });
    }

    const result = await db.query(
      'INSERT INTO momento_avaliacao (nome, dossie_id) VALUES ($1, $2) RETURNING *'
      , [nome, dossie_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/momento-avaliacao/:momentoId
 * Busca um momento de avaliação específico
 */
router.get('/momento-avaliacao/:momentoId', async (req, res, next) => {
  try {
    const { momentoId } = req.params;
    const userId = req.user.id;

    const result = await db.query(`
      SELECT ma.* 
      FROM momento_avaliacao ma
      JOIN dossie d ON d.id = ma.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ma.id = $1 AND pdt.professor_id = $2
    `, [momentoId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Momento de Avaliação not found or access denied' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dossie/:dossieId/momentos-avaliacao
 * Lista todos os momentos de avaliação para um dossiê
 */
router.get('/dossie/:dossieId/momentos-avaliacao', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;

    // Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.id 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or dossie not active' });
    }

    const result = await db.query(
      'SELECT * FROM momento_avaliacao WHERE dossie_id = $1 ORDER BY created_at DESC'
      , [dossieId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/momento-avaliacao/:momentoId/atualiza
 * Atualiza um momento de avaliação existente
 */
router.post('/momento-avaliacao/:momentoId/atualiza', async (req, res, next) => {
  try {
    const { momentoId } = req.params;
    const { nome } = req.body;
    const userId = req.user.id;

    if (!nome) {
      return res.status(400).json({ error: 'Validation error', details: 'nome is required' });
    }

    // Verificar se o momento existe e pertence ao professor
    const momentoCheck = await db.query(`
      SELECT ma.id 
      FROM momento_avaliacao ma
      JOIN dossie d ON d.id = ma.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ma.id = $1 AND pdt.professor_id = $2
    `, [momentoId, userId]);

    if (momentoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Momento de Avaliação not found or access denied' });
    }

    const result = await db.query(
      'UPDATE momento_avaliacao SET nome = $1, updated_at = NOW() WHERE id = $2 RETURNING *'
      , [nome, momentoId]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/momento-avaliacao/:momentoId/delete
 * Deleta um momento de avaliação
 */
router.get('/momento-avaliacao/:momentoId/delete', async (req, res, next) => {
  try {
    const { momentoId } = req.params;
    const userId = req.user.id;

    // Verificar se o momento existe e pertence ao professor
    const momentoCheck = await db.query(`
      SELECT ma.id 
      FROM momento_avaliacao ma
      JOIN dossie d ON d.id = ma.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ma.id = $1 AND pdt.professor_id = $2
    `, [momentoId, userId]);

    if (momentoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Momento de Avaliação not found or access denied' });
    }

    await db.query('DELETE FROM momento_avaliacao WHERE id = $1', [momentoId]);

    res.status(200).json({ message: 'Momento de Avaliação deletado com sucesso' });
  } catch (error) {
    next(error);
  }
});

// ==================== NOTAS FINAIS MOMENTO CRUD ====================

/**
 * POST /api/momento-avaliacao/:momentoId/notas-finais/save-batch
 * Salva um lote de notas finais para um momento de avaliação
 */
router.post('/momento-avaliacao/:momentoId/notas-finais/save-batch', async (req, res, next) => {
  try {
    const { momentoId } = req.params;
    const { notas } = req.body; // Array de { aluno_id, nota }
    const userId = req.user.id;

    if (!Array.isArray(notas) || notas.length === 0) {
      return res.status(400).json({ error: 'Validation error', details: 'notas array is required' });
    }

    // Verificar se o momento existe e pertence ao professor
    const momentoCheck = await db.query(`
      SELECT ma.id 
      FROM momento_avaliacao ma
      JOIN dossie d ON d.id = ma.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ma.id = $1 AND pdt.professor_id = $2
    `, [momentoId, userId]);

    if (momentoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Momento de Avaliação not found or access denied' });
    }

    const updatedNotas = await db.withTransaction(async (client) => {
      const results = [];
      for (const notaData of notas) {
        const { aluno_id, nota } = notaData;
        if (!aluno_id || nota === undefined) {
          throw new Error('Each note must have aluno_id and nota');
        }

        // Upsert (INSERT or UPDATE) the final note
        const result = await client.query(
          `INSERT INTO nota_final_momento (momento_avaliacao_id, aluno_id, nota, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (momento_avaliacao_id, aluno_id) DO UPDATE SET nota = EXCLUDED.nota, updated_at = NOW()
           RETURNING *`,
          [momentoId, aluno_id, nota]
        );
        results.push(result.rows[0]);
      }
      return results;
    });

    res.status(200).json({ message: 'Notas finais salvas com sucesso', notas: updatedNotas });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/momento-avaliacao/:momentoId/notas-finais
 * Busca todas as notas finais para um momento de avaliação
 */
router.get('/momento-avaliacao/:momentoId/notas-finais', async (req, res, next) => {
  try {
    const { momentoId } = req.params;
    const userId = req.user.id;

    // Verificar se o momento existe e pertence ao professor
    const momentoCheck = await db.query(`
      SELECT ma.id 
      FROM momento_avaliacao ma
      JOIN dossie d ON d.id = ma.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ma.id = $1 AND pdt.professor_id = $2
    `, [momentoId, userId]);

    if (momentoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Momento de Avaliação not found or access denied' });
    }

    const result = await db.query(`
      SELECT nfm.id, nfm.momento_avaliacao_id, nfm.aluno_id, nfm.nota::NUMERIC as nota, nfm.created_at, nfm.updated_at, u.nome as aluno_nome, u.numero_mecanografico as aluno_numero
      FROM nota_final_momento nfm
      JOIN users u ON u.id = nfm.aluno_id
      WHERE nfm.momento_avaliacao_id = $1
      ORDER BY u.nome
    `, [momentoId]);

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;