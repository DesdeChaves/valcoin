const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ==================== ELEMENTOS DE AVALIAÇÃO CRUD ====================

/**
 * POST /api/svelte/elemento/save
 * Cria um novo elemento de avaliação e gera notas vazias para todos os alunos
 */
router.post('/save', async (req, res, next) => {
  try {
    const { nome, descricao, tipo, ponderacao, criterio_id, data_avaliacao, cotacao_maxima, observacoes, ativo } = req.body;
    const userId = req.user.id;
    
    // Validação
    if (!nome || ponderacao === undefined || !criterio_id) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'nome, ponderacao and criterio_id are required' 
      });
    }
    
    // Validar ponderação (deve ser entre 0 e 100)
    if (ponderacao < 0 || ponderacao > 100) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'ponderacao must be between 0 and 100' 
      });
    }
    
    // Validar cotação máxima se fornecida
    if (cotacao_maxima !== undefined && cotacao_maxima <= 0) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'cotacao_maxima must be greater than 0' 
      });
    }
    
    // Verificar se o critério existe e pertence ao professor
    const criterioCheck = await db.query(`
      SELECT c.id, d.professor_disciplina_turma_id, pdt.disciplina_turma_id
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND c.ativo = true AND d.ativo = true
    `, [criterio_id, userId]);
    
    if (criterioCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or criterio not active' });
    }
    
    const criterio = criterioCheck.rows[0];
    
    // Usar transação para criar elemento e notas
    const result = await db.withTransaction(async (client) => {
      // Criar elemento de avaliação
      const elementoResult = await client.query(
        `INSERT INTO elemento_avaliacao 
        (nome, descricao, tipo, ponderacao, criterio_id, data_avaliacao, cotacao_maxima, observacoes, ativo) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [nome, descricao || null, tipo || 'outro', ponderacao, criterio_id, data_avaliacao || null, cotacao_maxima || 20, observacoes || null, ativo]
      );
      
      const elemento = elementoResult.rows[0];
      
      // Buscar todos os alunos da turma
      const alunosResult = await client.query(`
        SELECT aluno_id AS id
        FROM aluno_disciplina 
        WHERE disciplina_turma_id = $1
      `, [criterio.disciplina_turma_id]);
      
      // Criar nota vazia (0) para cada aluno
      const notasCreated = await Promise.all(
        alunosResult.rows.map(aluno =>
          client.query(
            'INSERT INTO nota_elemento (elemento_avaliacao_id, aluno_id, nota) VALUES ($1, $2, $3) RETURNING *',
            [elemento.id, aluno.id, 0]
          )
        )
      );
      
      return {
        elemento,
        notasCriadas: notasCreated.length
      };
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/svelte/elemento/:elementoId/atualiza
 * Atualiza um elemento de avaliação existente
 */
router.post('/elemento/:elementoId/atualiza', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const { nome, descricao, tipo, ponderacao, data_avaliacao, cotacao_maxima, observacoes, ativo } = req.body;
    const userId = req.user.id;
    
    // Validação
    if (!nome || ponderacao === undefined) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'nome and ponderacao are required' 
      });
    }
    
    // Validar ponderação
    if (ponderacao < 0 || ponderacao > 100) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'ponderacao must be between 0 and 100' 
      });
    }
    
    // Verificar se o elemento existe e pertence ao professor
    const elementoCheck = await db.query(`
      SELECT ea.id 
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    // Atualizar elemento
    const result = await db.query(
      `UPDATE elemento_avaliacao 
       SET nome = $1, descricao = $2, tipo = $3, ponderacao = $4, 
           data_avaliacao = $5, cotacao_maxima = $6, observacoes = $7, 
           ativo = $8
       WHERE id = $9 RETURNING *`,
      [nome, descricao || null, tipo || 'outro', ponderacao, data_avaliacao || null, cotacao_maxima || 20, observacoes || null, ativo, elementoId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/elemento/:elementoId/delete
 * Deleta um elemento de avaliação (e suas notas em cascata)
 */
router.get('/elemento/:elementoId/delete', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const { hard = false } = req.query;
    const userId = req.user.id;
    
    // Verificar se o elemento existe e pertence ao professor
    const elementoCheck = await db.query(`
      SELECT ea.id 
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    if (hard === 'true') {
      // Hard delete (remove permanentemente - cascade deleta notas)
      await db.query('DELETE FROM elemento_avaliacao WHERE id = $1', [elementoId]);
    } else {
      // Soft delete (marca como inativo)
      await db.query('UPDATE elemento_avaliacao SET ativo = false WHERE id = $1', [elementoId]);
    }
    
    res.status(200).json({ 
      message: hard === 'true' ? 'Elemento deleted permanently' : 'Elemento deactivated',
      id: elementoId
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ELEMENTOS - DETALHES E RELAÇÕES ====================

/**
 * GET /api/svelte/elemento/:elementoId
 * Busca detalhes de um elemento específico
 */
router.get('/elemento/:elementoId', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const userId = req.user.id;
    
    const result = await db.query(`
      SELECT 
        ea.*,
        c.nome as criterio_nome,
        c.ponderacao as criterio_ponderacao,
        d.nome as dossie_nome
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/notaselemento/:elementoId
 * Lista todas as notas de um elemento com informações dos alunos
 */
router.get('/notaselemento/:elementoId', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const userId = req.user.id;
    
    // Verificar acesso
    const elementoCheck = await db.query(`
      SELECT ea.id 
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    const result = await db.query(`
      SELECT 
        ne.*,
        u.id as aluno_id,
        u.nome as aluno_name,
        u.numero_mecanografico as aluno_numero
      FROM nota_elemento ne
      JOIN users u ON u.id = ne.aluno_id
      WHERE ne.elemento_avaliacao_id = $1 AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.nome ASC
    `, [elementoId]);
    
    // Formatar resposta para separar aluno e notas
    const alunoNotas = result.rows.map(row => ({
      aluno: {
        id: row.aluno_id,
        name: row.aluno_name,
        numero: row.aluno_numero
      },
      nota: {
        id: row.id,
        nota: parseFloat(row.nota), // Convert to number
        falta: row.falta,
        observacoes: row.observacoes,
        aluno_id: row.aluno_id,
        elemento_avaliacao_id: row.elemento_avaliacao_id,
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    }));
    
    res.json(alunoNotas);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/svelte/atualizanota
 * Atualiza a nota de um aluno num elemento
 */
router.post('/atualizanota', async (req, res, next) => {
  try {
    const { id, nota, falta, observacoes } = req.body;
    const userId = req.user.id;
    
    // Validação
    if (!id) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'id is required' 
      });
    }
    
    // Verificar acesso
    const notaCheck = await db.query(`
      SELECT ne.id, ea.cotacao_maxima
      FROM nota_elemento ne
      JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ne.id = $1 AND pdt.professor_id = $2
    `, [id, userId]);
    
    if (notaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Nota not found or access denied' });
    }
    
    // Validar nota se fornecida
    if (nota !== undefined && nota !== null) {
      const cotacaoMaxima = parseFloat(notaCheck.rows[0].cotacao_maxima);
      if (nota < 0 || nota > cotacaoMaxima) {
        return res.status(400).json({ 
          error: 'Validation error', 
          details: `nota must be between 0 and ${cotacaoMaxima}` 
        });
      }
    }
    
    // Atualizar nota
    const result = await db.query(
      'UPDATE nota_elemento SET nota = COALESCE($1, nota), falta = COALESCE($2, falta), observacoes = COALESCE($3, observacoes) WHERE id = $4 RETURNING *',
      [nota, falta, observacoes, id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/svelte/elemento/:elementoId/notas/lote
 * Atualiza múltiplas notas de uma vez
 */
router.post('/elemento/:elementoId/notas/lote', async (req, res, next) => {
  console.log('Request body for batch grade update:', JSON.stringify(req.body, null, 2));
  try {
    const { elementoId } = req.params;
    const { notas } = req.body; // Array de {notaId, nota, falta, observacoes}
    console.log('Parsed notas for batch grade update:', JSON.stringify(notas, null, 2));
    const userId = req.user.id;
    
    if (!Array.isArray(notas) || notas.length === 0) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'notas array is required' 
      });
    }
    
    // Verificar acesso ao elemento
    const elementoCheck = await db.query(`
      SELECT ea.id, ea.cotacao_maxima
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    const cotacaoMaxima = parseFloat(elementoCheck.rows[0].cotacao_maxima);
    
    // Usar transação para atualizar todas as notas
    const result = await db.withTransaction(async (client) => {
      const updated = [];
      
      for (const notaData of notas) {
        // Validar nota
        if (notaData.nota !== undefined && notaData.nota !== null) {
          if (notaData.nota < 0 || notaData.nota > cotacaoMaxima) {
            throw new Error(`Invalid nota ${notaData.nota} for notaId ${notaData.notaId}. Must be between 0 and ${cotacaoMaxima}`);
          }
        }
        
        const updatedNota = await client.query(
          `UPDATE nota_elemento 
           SET nota = COALESCE($1, nota), 
               falta = COALESCE($2, falta), 
               observacoes = COALESCE($3, observacoes)
           WHERE id = $4 AND elemento_avaliacao_id = $5 
           RETURNING *`,
          [notaData.nota, notaData.falta, notaData.observacoes, notaData.notaId, elementoId]
        );
        
        if (updatedNota.rows.length > 0) {
          updated.push(updatedNota.rows[0]);
        }
      }
      
      return updated;
    });
    
    res.json({
      message: 'Notas atualizadas com sucesso',
      notasAtualizadas: result.length,
      notas: result
    });
  } catch (error) {
    next(error);
  }
});

// ==================== ELEMENTOS - ESTATÍSTICAS E ANÁLISE ====================

/**
 * GET /api/svelte/elemento/:elementoId/estatisticas
 * Retorna estatísticas das notas do elemento
 */
router.get('/elemento/:elementoId/estatisticas', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const userId = req.user.id;
    
    // Verificar se o elemento existe e acesso
    const elementoCheck = await db.query(`
      SELECT ea.* 
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    const elemento = elementoCheck.rows[0];
    const cotacaoMaxima = elemento.cotacao_maxima;
    const halfMax = cotacaoMaxima / 2;

    // Usar view do schema para estatísticas (assuming it provides basic stats)
    // And add more specific calculations
    const statsResult = await db.query(`
      SELECT
        ROUND(AVG(ne.nota)::numeric, 2) AS media,
        ROUND(STDDEV_POP(ne.nota)::numeric, 2) AS desvio_padrao,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ne.nota) AS mediana,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ne.nota) AS percentil_25,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ne.nota) AS percentil_75,
        COUNT(ne.nota) FILTER (WHERE ne.nota < $2) AS notas_abaixo_metade_max
      FROM nota_elemento ne
      WHERE ne.elemento_avaliacao_id = $1 AND ne.nota IS NOT NULL AND ne.nota >= 0
    `, [elementoId, halfMax]);
    
    // Distribuição de notas (existing)
    const distribuicao = await db.query(`
      SELECT 
        nota,
        COUNT(*) as quantidade
      FROM nota_elemento ne
      WHERE ne.elemento_avaliacao_id = $1 AND ne.nota IS NOT NULL AND ne.nota >= 0
      GROUP BY nota
      ORDER BY nota
    `, [elementoId]);
    
    res.json({
      elemento: elementoCheck.rows[0],
      estatisticas: statsResult.rows[0],
      distribuicao: distribuicao.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/elemento/:elementoId/completo
 * Busca elemento com todas as suas relações
 */
router.get('/elemento/:elementoId/completo', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const userId = req.user.id;
    
    // Buscar elemento
    const elementoResult = await db.query(`
      SELECT 
        ea.*,
        c.nome as criterio_nome,
        c.ponderacao as criterio_ponderacao,
        d.nome as dossie_nome
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    // Buscar notas com alunos
    const notasResult = await db.query(`
      SELECT 
        ne.*,
        u.id as aluno_id,
        u.nome as aluno_name,
        u.numero_mecanografico as aluno_numero
      FROM nota_elemento ne
      JOIN users u ON u.id = ne.aluno_id
      WHERE ne.elemento_avaliacao_id = $1 AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.nome
    `, [elementoId]);
    
    res.json({
      elemento: elementoResult.rows[0],
      notas: notasResult.rows
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/criterio/:criterioId/elementos
 * Lista todos os elementos de um critério
 */
router.get('/criterio/:criterioId/elementos', async (req, res, next) => {
  try {
    const { criterioId } = req.params;
    const userId = req.user.id;
    
    // Verificar acesso
    const criterioCheck = await db.query(`
      SELECT c.id 
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (criterioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    const result = await db.query(`
      SELECT 
        ea.*,
        COUNT(ne.id) as total_notas,
        COUNT(ne.id) FILTER (WHERE ne.nota > 0) as notas_atribuidas,
        COUNT(ne.id) FILTER (WHERE ne.falta = true) as total_faltas
      FROM elemento_avaliacao ea
      LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id
      WHERE ea.criterio_id = $1
      GROUP BY ea.id
      ORDER BY ea.data_avaliacao DESC NULLS LAST, ea.nome
    `, [criterioId]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/svelte/elemento/:elementoId/duplicar
 * Duplica um elemento (cria novas notas vazias)
 */
router.post('/elemento/:elementoId/duplicar', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const { novoNome, novaData } = req.body;
    const userId = req.user.id;
    
    if (!novoNome) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'novoNome is required' 
      });
    }
    
    // Usar transação
    const result = await db.withTransaction(async (client) => {
      // Buscar elemento original com verificação de acesso
      const elementoOriginal = await client.query(`
        SELECT ea.*, pdt.disciplina_turma_id
        FROM elemento_avaliacao ea
        JOIN criterio c ON c.id = ea.criterio_id
        JOIN dossie d ON d.id = c.dossie_id
        JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
        WHERE ea.id = $1 AND pdt.professor_id = $2
      `, [elementoId, userId]);
      
      if (elementoOriginal.rows.length === 0) {
        throw new Error('Elemento not found or access denied');
      }
      
      const original = elementoOriginal.rows[0];
      
      // Criar novo elemento
      const novoElemento = await client.query(
        `INSERT INTO elemento_avaliacao 
        (nome, descricao, tipo, ponderacao, criterio_id, data_avaliacao, cotacao_maxima, observacoes) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [novoNome, original.descricao, original.tipo, original.ponderacao, original.criterio_id, novaData || null, original.cotacao_maxima, original.observacoes]
      );
      
      // Buscar alunos
      const alunosResult = await client.query(`
        SELECT aluno_id AS id
        FROM aluno_disciplina 
        WHERE disciplina_turma_id = $1
      `, [original.disciplina_turma_id]);
      
      // Criar notas vazias
      await Promise.all(
        alunosResult.rows.map(aluno =>
          client.query(
            'INSERT INTO nota_elemento (elemento_avaliacao_id, aluno_id, nota) VALUES ($1, $2, $3)',
            [novoElemento.rows[0].id, aluno.id, 0]
          )
        )
      );
      
      return novoElemento.rows[0];
    });
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/elemento/:elementoId/ranking
 * Retorna ranking dos alunos no elemento
 */
router.get('/elemento/:elementoId/ranking', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    const userId = req.user.id;
    
    // Verificar acesso
    const elementoCheck = await db.query(`
      SELECT ea.id 
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1 AND pdt.professor_id = $2
    `, [elementoId, userId]);
    
    if (elementoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found or access denied' });
    }
    
    const result = await db.query(`
      SELECT 
        u.id,
        u.nome as name,
        u.numero_mecanografico as numero,
        ne.nota,
        ne.falta,
        RANK() OVER (ORDER BY ne.nota DESC) as posicao
      FROM nota_elemento ne
      JOIN users u ON u.id = ne.aluno_id
      WHERE ne.elemento_avaliacao_id = $1 AND ne.nota > 0 AND ne.falta = false AND u.tipo_utilizador = 'ALUNO'
      ORDER BY ne.nota DESC, u.nome
    `, [elementoId]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/elementos/tipos
 * Estatísticas de elementos por tipo num dossiê
 */
router.get('/dossie/:dossieId/elementos/tipos', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    // Verificar acesso
    const dossieCheck = await db.query(`
      SELECT d.id 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    const result = await db.query(`
      SELECT 
        ea.tipo,
        COUNT(ea.id) as total_elementos,
        COUNT(ne.id) FILTER (WHERE ne.nota > 0) as notas_atribuidas,
        ROUND(AVG(ne.nota) FILTER (WHERE ne.nota > 0), 2) as media
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id
      WHERE c.dossie_id = $1 AND ea.ativo = true
      GROUP BY ea.tipo
      ORDER BY ea.tipo
    `, [dossieId]);
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dossie/:dossieId/instrumentos
 * Busca todos os instrumentos de avaliação de um dossiê específico
 */
router.get('/dossie/:dossieId/instrumentos', async (req, res, next) => {
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

    // Buscar instrumentos do dossiê
    const instrumentosResult = await db.query(`
      SELECT
        ea.id,
        ea.nome,
        ea.tipo,
        ea.ponderacao,
        ea.data_avaliacao,
        ea.cotacao_maxima,
        c.nome as criterio_nome
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      WHERE c.dossie_id = $1 AND ea.ativo = true
      ORDER BY c.nome, ea.nome
    `, [dossieId]);

    res.json(instrumentosResult.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;