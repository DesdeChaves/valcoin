const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ==================== CRITÉRIOS CRUD ====================

/**
 * GET /api/svelte/criterios/:dossieId/pesquisa
 * Busca todos os critérios de um dossiê específico
 */
router.get('/:dossieId/pesquisa', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    // Buscar dossiê com verificação de acesso
    const dossieResult = await db.query(`
      SELECT d.* 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    // Buscar critérios do dossiê
    const criteriosResult = await db.query(
      'SELECT * FROM criterio WHERE dossie_id = $1 ORDER BY ordem, nome',
      [dossieId]
    );
    
    res.json({
      dossie: dossieResult.rows[0],
      criterios: criteriosResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/criterio/save
 * Cria um novo critério
 */
router.post('/save', async (req, res) => {
  try {
    const { nome, descricao, ponderacao, dossie_id, ordem } = req.body;
    const userId = req.user.id;
    
    // Validação
    if (!nome || ponderacao === undefined || !dossie_id) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'nome, ponderacao and dossie_id are required' 
      });
    }
    
    // Validar ponderação (deve ser entre 0 e 100)
    if (ponderacao < 0 || ponderacao > 100) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'ponderacao must be between 0 and 100' 
      });
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
    
    // Se ordem não fornecida, calcular próxima ordem
    let ordemFinal = ordem;
    if (ordemFinal === undefined || ordemFinal === null) {
      const maxOrdemResult = await db.query(
        'SELECT COALESCE(MAX(ordem), -1) + 1 as proxima_ordem FROM criterio WHERE dossie_id = $1',
        [dossie_id]
      );
      ordemFinal = maxOrdemResult.rows[0].proxima_ordem;
    }
    
    // Criar critério
    const result = await db.query(
      'INSERT INTO criterio (nome, descricao, ponderacao, dossie_id, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nome, descricao || null, ponderacao, dossie_id, ordemFinal]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/criterio/:criterioId/atualiza
 * Atualiza um critério existente
 */
router.post('/:criterioId/atualiza', async (req, res) => {
  try {
    const { criterioId } = req.params;
    const { nome, descricao, ponderacao, ordem, ativo } = req.body;
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
    
    // Verificar se o critério existe e pertence ao professor
    const criterioCheck = await db.query(`
      SELECT c.* 
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (criterioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    // Atualizar critério
    const result = await db.query(
      'UPDATE criterio SET nome = $1, descricao = $2, ponderacao = $3, ordem = COALESCE($4, ordem), ativo = COALESCE($5, ativo) WHERE id = $6 RETURNING *',
      [nome, descricao || null, ponderacao, ordem, ativo, criterioId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/criterio/:criterioId/delete
 * Deleta um critério (verifica se tem elementos associados)
 */
router.get('/:criterioId/delete', async (req, res) => {
  try {
    const { criterioId } = req.params;
    const { hard = false } = req.query;
    const userId = req.user.id;
    
    // Verificar se o critério existe e pertence ao professor
    const criterioCheck = await db.query(`
      SELECT c.* 
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (criterioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    // Verificar se há elementos de avaliação associados
    const elementosCheck = await db.query(
      'SELECT COUNT(*) as total FROM elemento_avaliacao WHERE criterio_id = $1 AND ativo = true',
      [criterioId]
    );
    
    const totalElementos = parseInt(elementosCheck.rows[0].total);
    
    if (totalElementos > 0 && hard !== 'true') {
      return res.status(400).json({ 
        error: 'Cannot delete criterio',
        details: `This criterio has ${totalElementos} elemento(s) de avaliação associated. Use hard=true to force delete or deactivate them first.`
      });
    }
    
    if (hard === 'true') {
      // Hard delete (remove permanentemente)
      await db.query('DELETE FROM criterio WHERE id = $1', [criterioId]);
    } else {
      // Soft delete (marca como inativo)
      await db.query('UPDATE criterio SET ativo = false WHERE id = $1', [criterioId]);
    }
    
    res.status(200).json({ 
      message: hard === 'true' ? 'Criterio deleted permanently' : 'Criterio deactivated',
      id: criterioId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CRITÉRIOS - DETALHES E RELAÇÕES ====================

/**
 * GET /api/svelte/criterio/:criterioId
 * Busca detalhes de um critério específico
 */
router.get('/:criterioId', async (req, res) => {
  try {
    const { criterioId } = req.params;
    const userId = req.user.id;
    
    const result = await db.query(`
      SELECT 
        c.*,
        d.nome as dossie_nome
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/criterio/:criterioId/elementos
 * Lista todos os elementos de avaliação que usam este critério
 */
router.get('/:criterioId/elementos', async (req, res) => {
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
        d.nome as dossie_nome
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      WHERE ea.criterio_id = $1
      ORDER BY ea.data_avaliacao DESC, ea.nome
    `, [criterioId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/criterio/:criterioId/completo
 * Busca critério com todas as suas relações
 */
router.get('/:criterioId/completo', async (req, res) => {
  try {
    const { criterioId } = req.params;
    const userId = req.user.id;
    
    // Buscar critério
    const criterioResult = await db.query(`
      SELECT c.*, d.nome as dossie_nome, d.id as dossie_id
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (criterioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    const criterio = criterioResult.rows[0];
    
    // Buscar dossiê
    const dossieResult = await db.query(
      'SELECT * FROM dossie WHERE id = $1',
      [criterio.dossie_id]
    );
    
    // Buscar elementos de avaliação
    const elementosResult = await db.query(
      'SELECT * FROM elemento_avaliacao WHERE criterio_id = $1 ORDER BY data_avaliacao DESC, nome',
      [criterioId]
    );
    
    res.json({
      criterio: {
        id: criterio.id,
        nome: criterio.nome,
        descricao: criterio.descricao,
        ponderacao: criterio.ponderacao,
        ordem: criterio.ordem,
        ativo: criterio.ativo,
        created_at: criterio.created_at,
        updated_at: criterio.updated_at
      },
      dossie: dossieResult.rows[0],
      elementos: elementosResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CRITÉRIOS - ESTATÍSTICAS E ANÁLISE ====================

/**
 * GET /api/svelte/criterio/:criterioId/estatisticas
 * Retorna estatísticas de utilização do critério
 */
router.get('/:criterioId/estatisticas', async (req, res) => {
  try {
    const { criterioId } = req.params;
    const userId = req.user.id;
    
    // Verificar se o critério existe e acesso
    const criterioCheck = await db.query(`
      SELECT c.* 
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (criterioCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    // Contar elementos que usam este critério
    const elementosCount = await db.query(
      'SELECT COUNT(*) as total FROM elemento_avaliacao WHERE criterio_id = $1 AND ativo = true',
      [criterioId]
    );
    
    // Contar notas atribuídas através deste critério
    const notasCount = await db.query(`
      SELECT COUNT(*) as total
      FROM nota_elemento ne
      JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
      WHERE ea.criterio_id = $1 AND ne.nota > 0
    `, [criterioId]);
    
    // Média de notas deste critério
    const mediaNotas = await db.query(`
      SELECT 
        ROUND(AVG(ne.nota)::numeric, 2) as media,
        ROUND(MIN(ne.nota)::numeric, 2) as minimo,
        ROUND(MAX(ne.nota)::numeric, 2) as maximo,
        ROUND(STDDEV_POP(ne.nota)::numeric, 2) as desvio_padrao
      FROM nota_elemento ne
      JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
      WHERE ea.criterio_id = $1 AND ne.nota > 0
    `, [criterioId]);
    
    // Distribuição por tipo de elemento
    const distribuicaoTipo = await db.query(`
      SELECT 
        ea.tipo,
        COUNT(ea.id) as total_elementos,
        COUNT(ne.id) FILTER (WHERE ne.nota > 0) as notas_atribuidas
      FROM elemento_avaliacao ea
      LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id
      WHERE ea.criterio_id = $1 AND ea.ativo = true
      GROUP BY ea.tipo
      ORDER BY ea.tipo
    `, [criterioId]);
    
    res.json({
      criterio: criterioCheck.rows[0],
      totalElementos: parseInt(elementosCount.rows[0].total),
      totalNotasAtribuidas: parseInt(notasCount.rows[0].total),
      estatisticasNotas: mediaNotas.rows[0],
      distribuicaoPorTipo: distribuicaoTipo.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/criterios/validacao
 * Valida se a soma das ponderações dos critérios é 100%
 */
router.get('/dossie/:dossieId/validacao', async (req, res) => {
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
    
    // Somar ponderações
    const somaResult = await db.query(
      'SELECT COALESCE(SUM(ponderacao), 0) as total FROM criterio WHERE dossie_id = $1 AND ativo = true',
      [dossieId]
    );
    
    const totalPonderacao = parseFloat(somaResult.rows[0].total);
    const isValido = totalPonderacao === 100;
    
    // Buscar critérios
    const criteriosResult = await db.query(
      'SELECT id, nome, ponderacao, ordem FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem, nome',
      [dossieId]
    );
    
    res.json({
      isValido,
      totalPonderacao,
      diferenca: 100 - totalPonderacao,
      criterios: criteriosResult.rows,
      mensagem: isValido 
        ? 'Ponderações válidas (soma = 100%)' 
        : `Atenção: soma das ponderações é ${totalPonderacao}% (deveria ser 100%)`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/criterio/:criterioId/duplicar
 * Duplica um critério (sem duplicar elementos)
 */
router.post('/:criterioId/duplicar', async (req, res) => {
  try {
    const { criterioId } = req.params;
    const { novoNome, copiarElementos = false } = req.body;
    const userId = req.user.id;
    
    if (!novoNome) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'novoNome is required' 
      });
    }
    
    // Buscar critério original com verificação de acesso
    const criterioOriginal = await db.query(`
      SELECT c.* 
      FROM criterio c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2
    `, [criterioId, userId]);
    
    if (criterioOriginal.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found or access denied' });
    }
    
    const original = criterioOriginal.rows[0];
    
    // Usar transação se copiar elementos
    if (copiarElementos) {
      const result = await db.withTransaction(async (client) => {
        // Criar novo critério
        const novoCriterio = await client.query(
          'INSERT INTO criterio (nome, descricao, ponderacao, dossie_id, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [novoNome, original.descricao, original.ponderacao, original.dossie_id, original.ordem + 1]
        );
        
        // Buscar elementos do critério original
        const elementosOriginais = await client.query(
          'SELECT * FROM elemento_avaliacao WHERE criterio_id = $1 AND ativo = true',
          [criterioId]
        );
        
        // Duplicar elementos
        const elementosDuplicados = [];
        for (const elemento of elementosOriginais.rows) {
          const novoElemento = await client.query(
            'INSERT INTO elemento_avaliacao (nome, descricao, tipo, ponderacao, criterio_id, cotacao_maxima) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [elemento.nome, elemento.descricao, elemento.tipo, elemento.ponderacao, novoCriterio.rows[0].id, elemento.cotacao_maxima]
          );
          elementosDuplicados.push(novoElemento.rows[0]);
        }
        
        return {
          criterio: novoCriterio.rows[0],
          elementos: elementosDuplicados
        };
      });
      
      res.status(201).json(result);
    } else {
      // Criar novo critério sem elementos
      const novoCriterio = await db.query(
        'INSERT INTO criterio (nome, descricao, ponderacao, dossie_id, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [novoNome, original.descricao, original.ponderacao, original.dossie_id, original.ordem + 1]
      );
      
      res.status(201).json(novoCriterio.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/dossie/:dossieId/criterios/ajustar-ponderacoes
 * Ajusta automaticamente as ponderações para somarem 100%
 */
router.post('/dossie/:dossieId/ajustar-ponderacoes', async (req, res) => {
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
    
    // Buscar critérios
    const criteriosResult = await db.query(
      'SELECT * FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem',
      [dossieId]
    );
    
    const criterios = criteriosResult.rows;
    
    if (criterios.length === 0) {
      return res.status(400).json({ 
        error: 'No criterios found',
        details: 'Cannot adjust ponderations without criterios' 
      });
    }
    
    // Calcular ponderação igual para todos
    const ponderacaoIgual = Math.floor(100 / criterios.length);
    const resto = 100 - (ponderacaoIgual * criterios.length);
    
    // Usar transação para atualizar todos
    const result = await db.transaction(async (client) => {
      const updated = [];
      
      for (let i = 0; i < criterios.length; i++) {
        const criterio = criterios[i];
        // Adicionar resto ao primeiro critério
        const ponderacao = i === 0 ? ponderacaoIgual + resto : ponderacaoIgual;
        
        const updatedCriterio = await client.query(
          'UPDATE criterio SET ponderacao = $1 WHERE id = $2 RETURNING *',
          [ponderacao, criterio.id]
        );
        
        updated.push(updatedCriterio.rows[0]);
      }
      
      return updated;
    });
    
    res.json({
      message: 'Ponderações ajustadas com sucesso',
      criterios: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/dossie/:dossieId/criterios/reordenar
 * Reordena critérios
 */
router.post('/dossie/:dossieId/reordenar', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const { ordem } = req.body; // Array de { id, ordem }
    const userId = req.user.id;
    
    if (!Array.isArray(ordem) || ordem.length === 0) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'ordem array is required' 
      });
    }
    
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
    
    // Usar transação para atualizar
    const result = await db.transaction(async (client) => {
      const updated = [];
      
      for (const item of ordem) {
        const updatedCriterio = await client.query(
          'UPDATE criterio SET ordem = $1 WHERE id = $2 AND dossie_id = $3 RETURNING *',
          [item.ordem, item.id, dossieId]
        );
        
        if (updatedCriterio.rows.length > 0) {
          updated.push(updatedCriterio.rows[0]);
        }
      }
      
      return updated;
    });
    
    res.json({
      message: 'Critérios reordenados com sucesso',
      criterios: result
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/criterio/:criterioId/alunos-medias
 * Calcula a média de cada aluno neste critério
 */
router.get('/:criterioId/alunos-medias', async (req, res) => {
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
    
    // Usar função do schema para calcular médias
    const result = await db.query(`
      SELECT 
        u.id,
        u.nome as name,
        u.numero_mecanografico as numero,
        calcular_nota_criterio($1, u.id) as media,
        COUNT(DISTINCT ea.id) as total_elementos,
        COUNT(ne.id) FILTER (WHERE ne.nota > 0) as elementos_avaliados
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      CROSS JOIN elemento_avaliacao ea
      LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id AND ne.aluno_id = u.id
      WHERE ad.disciplina_turma_id = (
        SELECT pdt.disciplina_turma_id
        FROM criterio c
        JOIN dossie d ON c.dossie_id = d.id
        JOIN professor_disciplina_turma pdt ON d.professor_disciplina_turma_id = pdt.id
        WHERE c.id = $1
      ) AND ea.criterio_id = $1 AND ea.ativo = true AND u.tipo_utilizador = 'ALUNO'
      GROUP BY u.id, u.nome, u.numero_mecanografico
      ORDER BY u.nome
    `, [criterioId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/criterios/dossie/:dossieId/completo
 * Lista critérios com contagem de elementos
 */
router.get('/dossie/:dossieId/completo', async (req, res) => {
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
        c.*,
        COUNT(ea.id) FILTER (WHERE ea.ativo = true) as total_elementos
      FROM criterio c
      LEFT JOIN elemento_avaliacao ea ON ea.criterio_id = c.id
      WHERE c.dossie_id = $1
      GROUP BY c.id
      ORDER BY c.ordem, c.nome
    `, [dossieId]);
    
    // Calcular soma das ponderações
    const somaResult = await db.query(
      'SELECT COALESCE(SUM(ponderacao), 0) as total FROM criterio WHERE dossie_id = $1 AND ativo = true',
      [dossieId]
    );
    
    const totalPonderacao = parseFloat(somaResult.rows[0].total);
    
    res.json({
      criterios: result.rows,
      totalPonderacao,
      isValido: totalPonderacao === 100
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
