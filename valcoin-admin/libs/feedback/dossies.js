const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ==================== HELPERS ====================

// Helper function to check if a dossie belongs to the logged-in professor
const checkDossieAccess = async (dossieId, professorId) => {
  const { rows } = await db.query(`
    SELECT d.id, pdt.id as professor_disciplina_turma_id, pdt.disciplina_turma_id
    FROM dossie d
    JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
    WHERE d.id = $1 AND pdt.professor_id = $2 AND pdt.ativo = true
  `, [dossieId, professorId]);
  return rows[0];
};


// ==================== DOSSIÊS CRUD ====================

/**
 * GET /api/svelte/dossies/for-assignment/:assignmentId
 * Busca todos os dossiês de uma atribuição (assignment) específica do professor
 */
router.get('/for-assignment/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.user.id;
    
    // Validate that the provided assignmentId belongs to the professor and is active
    const assignmentCheck = await db.query(
      'SELECT id FROM professor_disciplina_turma WHERE id = $1 AND professor_id = $2 AND ativo = true',
      [assignmentId, userId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found or access denied for this professor.' });
    }
    
    // Fetch dossiês for that specific assignment
    const dossiesResult = await db.query(
      'SELECT * FROM dossie WHERE professor_disciplina_turma_id = $1 ORDER BY data_inicio DESC, nome',
      [assignmentId] // Use the validated assignmentId
    );
    
    res.json(dossiesResult.rows);
  } catch (error) {
    console.error('Error in /for-assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * POST /api/svelte/dossie/save
 * Cria um novo dossiê
 */
router.post('/save', async (req, res) => {
  try {
    const { nome, descricao, professor_disciplina_turma_id, data_inicio, data_fim, ativo, escala_avaliacao } = req.body;
    const userId = req.user.id;
    
    // Validação
    if (!nome || !professor_disciplina_turma_id) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'nome and professor_disciplina_turma_id are required' 
      });
    }
    
    // Validate that the provided professor_disciplina_turma_id exists, is active, and belongs to the current user.
    const assignmentCheck = await db.query(
      'SELECT id FROM professor_disciplina_turma WHERE id = $1 AND professor_id = $2 AND ativo = true',
      [professor_disciplina_turma_id, userId]
    );
    
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied: Provided professor_disciplina_turma_id is invalid or does not belong to the professor.' });
    }

    const validatedProfessorDisciplinaTurmaId = assignmentCheck.rows[0].id; // This confirms the ID is valid for the user
    
    // Validar datas se fornecidas
    if (data_inicio && data_fim && new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'data_inicio must be before data_fim' 
      });
    }
    
    // Criar dossiê using the validated professor_disciplina_turma_id.
    const result = await db.query(
      'INSERT INTO dossie (nome, descricao, professor_disciplina_turma_id, data_inicio, data_fim, ativo, escala_avaliacao) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nome, descricao, validatedProfessorDisciplinaTurmaId, data_inicio || null, data_fim || null, ativo, escala_avaliacao || 20]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/dossie/:dossieId/atualiza
 * Atualiza um dossiê existente
 */
router.post('/:dossieId/atualiza', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const { nome, descricao, data_inicio, data_fim, ativo, escala_avaliacao } = req.body;
    const userId = req.user.id;
    
    if (!nome) {
      return res.status(400).json({ error: 'Validation error', details: 'nome is required' });
    }
    
    const dossieAccess = await checkDossieAccess(dossieId, userId);
    if (!dossieAccess) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    if (data_inicio && data_fim && new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ error: 'Validation error', details: 'data_inicio must be before data_fim' });
    }
    
    const result = await db.query(
      'UPDATE dossie SET nome = $1, descricao = $2, data_inicio = $3, data_fim = $4, ativo = $5, escala_avaliacao = $6 WHERE id = $7 RETURNING *',
      [nome, descricao, data_inicio || null, data_fim || null, ativo, escala_avaliacao || 20, dossieId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/delete
 * Deleta um dossiê (soft delete ou hard delete)
 */
router.get('/:dossieId/delete', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const { hard = false } = req.query;
    const userId = req.user.id;
    
    const dossieAccess = await checkDossieAccess(dossieId, userId);
    if (!dossieAccess) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    if (hard === 'true') {
      await db.query('DELETE FROM dossie WHERE id = $1', [dossieId]);
    } else {
      await db.query('UPDATE dossie SET ativo = false WHERE id = $1', [dossieId]);
    }
    
    res.status(200).json({ 
      message: hard === 'true' ? 'Dossie deleted permanently' : 'Dossie deactivated',
      id: dossieId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DOSSIÊS - LISTAGENS E RELAÇÕES ====================

/**
 * GET /api/svelte/dossiers
 * Lista todos os dossiês do professor autenticado, agrupados por disciplina/turma
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { apenas_ativos = true } = req.query;
    
    // Buscar todas as atribuições ativas do professor
    const assignmentsResult = await db.query(
      `SELECT 
        pdt.id as professor_disciplina_turma_id,
        dt.id as disciplina_turma_id,
        d.nome as disciplina_nome,
        c.nome as turma_nome,
        c.ano_letivo
       FROM professor_disciplina_turma pdt
       JOIN disciplina_turma dt ON dt.id = pdt.disciplina_turma_id
       JOIN subjects d ON d.id = dt.disciplina_id
       JOIN classes c ON c.id = dt.turma_id
       WHERE pdt.professor_id = $1 AND pdt.ativo = true
       ORDER BY c.ano_letivo DESC, d.nome, c.nome`,
      [userId]
    );
    
    // Para cada atribuição, buscar seus dossiês
    const result = await Promise.all(
      assignmentsResult.rows.map(async (assignment) => {
        const whereClause = apenas_ativos === 'true' 
          ? 'WHERE professor_disciplina_turma_id = $1 AND ativo = true' 
          : 'WHERE professor_disciplina_turma_id = $1';
        
        const dossiesResult = await db.query(
          `SELECT * FROM dossie ${whereClause} ORDER BY data_inicio DESC, nome`,
          [assignment.professor_disciplina_turma_id]
        );
        
        return {
          assignment: assignment,
          dossies: dossiesResult.rows
        };
      })
    );
    
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/dossiers/:dossieId/pesquisa
 * Busca informações completas de um dossiê
 */
router.get('/:dossieId/pesquisa', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    const dossieAccess = await checkDossieAccess(dossieId, userId);
    if (!dossieAccess) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    const dossieResult = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    const dossie = dossieResult.rows[0];
    
    const criteriosResult = await db.query('SELECT * FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem, nome', [dossieId]);
    const elementosResult = await db.query('SELECT ea.*, c.nome as criterio_nome FROM elemento_avaliacao ea JOIN criterio c ON c.id = ea.criterio_id WHERE c.dossie_id = $1 AND ea.ativo = true ORDER BY c.ordem, ea.nome', [dossieId]);
    const contadoresResult = await db.query('SELECT * FROM contador WHERE dossie_id = $1 AND ativo = true ORDER BY tipo, shortname', [dossieId]);
    
    const alunosResult = await db.query(`
      SELECT u.* 
      FROM users u
      JOIN aluno_turma at ON u.id = at.aluno_id
      WHERE at.turma_id = (SELECT turma_id FROM disciplina_turma WHERE id = $1)
      ORDER BY u.nome
    `, [dossieAccess.disciplina_turma_id]);
    
    res.json({
      dossie,
      professorDisciplinaTurma: { id: dossie.professor_disciplina_turma_id },
      criterios: criteriosResult.rows,
      elementos: elementosResult.rows,
      contadores: contadoresResult.rows,
      alunos: alunosResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DOSSIÊS - ESTATÍSTICAS E ANÁLISE ====================

/**
 * GET /api/svelte/dossie/:dossieId/estatisticas
 * Retorna estatísticas gerais de um dossiê
 */
router.get('/:dossieId/estatisticas', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    const dossieAccess = await checkDossieAccess(dossieId, userId);
    if (!dossieAccess) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    const resumoResult = await db.query('SELECT * FROM v_dossie_resumo WHERE id = $1', [dossieId]);
    const notasCount = await db.query('SELECT COUNT(*) as total FROM nota_elemento ne JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id JOIN criterio c ON c.id = ea.criterio_id WHERE c.dossie_id = $1 AND ne.nota > 0', [dossieId]);
    const contadoresCount = await db.query('SELECT COUNT(*) as total FROM contador_registo cr JOIN contador c ON c.id = cr.contador_id WHERE c.dossie_id = $1', [dossieId]);
    
    res.json({
      dossie: (await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId])).rows[0],
      resumo: resumoResult.rows[0],
      totalNotasRegistradas: parseInt(notasCount.rows[0].total),
      totalRegistosContadores: parseInt(contadoresCount.rows[0].total)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/progresso
 * Retorna o progresso de avaliação do dossiê
 */
router.get('/:dossieId/progresso', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    const dossieAccess = await checkDossieAccess(dossieId, userId);
    if (!dossieAccess) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    const totalEsperadoResult = await db.query('SELECT COUNT(*) as total FROM nota_elemento ne JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id JOIN criterio c ON c.id = ea.criterio_id WHERE c.dossie_id = $1', [dossieId]);
    const totalAtribuidasResult = await db.query('SELECT COUNT(*) as total FROM nota_elemento ne JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id JOIN criterio c ON c.id = ea.criterio_id WHERE c.dossie_id = $1 AND ne.nota > 0', [dossieId]);
    
    const totalEsperado = parseInt(totalEsperadoResult.rows[0].total);
    const totalAtribuidas = parseInt(totalAtribuidasResult.rows[0].total);
    const percentagem = totalEsperado > 0 ? Math.round((totalAtribuidas / totalEsperado) * 100) : 0;
    
    res.json({
      dossie: (await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId])).rows[0],
      totalEsperado,
      totalAtribuidas,
      totalPendentes: totalEsperado - totalAtribuidas,
      percentagem
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/dossie/:dossieId/duplicar
 * Duplica um dossiê com todos os seus critérios, elementos e contadores
 */
router.post('/:dossieId/duplicar', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const { novoNome, copiarNotas = false } = req.body;
    const userId = req.user.id;
    
    if (!novoNome) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'novoNome is required' 
      });
    }
    
    const result = await db.withTransaction(async (client) => {
      const dossieAccess = await checkDossieAccess(dossieId, userId);
      if (!dossieAccess) {
        throw new Error('Dossie not found or access denied');
      }
      const original = (await client.query('SELECT * FROM dossie WHERE id = $1', [dossieId])).rows[0];
      
      const novoDossie = await client.query(
        'INSERT INTO dossie (nome, descricao, professor_disciplina_turma_id, data_inicio, data_fim) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [novoNome, original.descricao, original.professor_disciplina_turma_id, null, null]
      );
      const novoDossieId = novoDossie.rows[0].id;
      
      const criteriosOriginais = await client.query('SELECT * FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem', [dossieId]);
      
      for (const criterio of criteriosOriginais.rows) {
        const novoCriterio = await client.query('INSERT INTO criterio (nome, descricao, ponderacao, dossie_id, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING *', [criterio.nome, criterio.descricao, criterio.ponderacao, novoDossieId, criterio.ordem]);
        const novoCriterioId = novoCriterio.rows[0].id;
        
        const elementosOriginais = await client.query('SELECT * FROM elemento_avaliacao WHERE criterio_id = $1 AND ativo = true', [criterio.id]);
        
        for (const elemento of elementosOriginais.rows) {
          const novoElemento = await client.query('INSERT INTO elemento_avaliacao (nome, descricao, tipo, ponderacao, criterio_id, cotacao_maxima) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [elemento.nome, elemento.descricao, elemento.tipo, elemento.ponderacao, novoCriterioId, elemento.cotacao_maxima]);
          
          if (!copiarNotas) {
            const alunosResult = await client.query('SELECT u.id FROM users u JOIN aluno_turma at ON u.id = at.aluno_id WHERE at.turma_id = (SELECT dt.turma_id FROM disciplina_turma dt WHERE dt.id = $1)', [dossieAccess.disciplina_turma_id]);
            for (const aluno of alunosResult.rows) {
              await client.query('INSERT INTO nota_elemento (elemento_avaliacao_id, aluno_id, nota) VALUES ($1, $2, $3)', [novoElemento.rows[0].id, aluno.id, 0]);
            }
          }
        }
      }
      
      const contadoresOriginais = await client.query('SELECT * FROM contador WHERE dossie_id = $1 AND ativo = true', [dossieId]);
      for (const contador of contadoresOriginais.rows) {
        await client.query('INSERT INTO contador (shortname, descritor, tipo, incremento, dossie_id, cor, icone) VALUES ($1, $2, $3, $4, $5, $6, $7)', [contador.shortname, contador.descritor, contador.tipo, contador.incremento, novoDossieId, contador.cor, contador.icone]);
      }
      
      return novoDossie.rows[0];
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/validacao
 * Valida a configuração do dossiê
 */
router.get('/:dossieId/validacao', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    const dossieAccess = await checkDossieAccess(dossieId, userId);
    if (!dossieAccess) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    const somaPonderacoes = await db.query('SELECT COALESCE(SUM(ponderacao), 0) as total FROM criterio WHERE dossie_id = $1 AND ativo = true', [dossieId]);
    const total = parseFloat(somaPonderacoes.rows[0].total);
    const ponderacoesValidas = total === 100;
    
    const criteriosSemElementos = await db.query('SELECT c.id, c.nome FROM criterio c LEFT JOIN elemento_avaliacao ea ON ea.criterio_id = c.id AND ea.ativo = true WHERE c.dossie_id = $1 AND c.ativo = true GROUP BY c.id, c.nome HAVING COUNT(ea.id) = 0', [dossieId]);
    
    res.json({
      dossie: (await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId])).rows[0],
      validacao: {
        ponderacoesValidas,
        somaPonderacoes: total,
        diferenca: 100 - total,
        criteriosSemElementos: criteriosSemElementos.rows,
        temCriteriosSemElementos: criteriosSemElementos.rows.length > 0
      },
      mensagens: [
        !ponderacoesValidas && `Atenção: soma das ponderações é ${total}% (deveria ser 100%)`,
        criteriosSemElementos.rows.length > 0 && `${criteriosSemElementos.rows.length} critério(s) sem elementos de avaliação`
      ].filter(Boolean)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dossie/:dossieId/grades-calculation
 * Busca todos os dados necessários para o cálculo das notas finais de um dossiê
 */
router.get('/:dossieId/grades-calculation', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;

    const dossieAccess = await checkDossieAccess(dossieId, userId);
     if (!dossieAccess) {
      return res.status(403).json({ error: 'Access denied or dossie not active' });
    }

    const disciplinaTurmaId = dossieAccess.disciplina_turma_id;

    const studentsResult = await db.query(`
      SELECT u.id, u.nome, u.numero_mecanografico
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      WHERE ad.disciplina_turma_id = $1 AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.nome
    `, [disciplinaTurmaId]);

    const criteriaResult = await db.query('SELECT id, nome, ponderacao FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem, nome', [dossieId]);

    const criteriaWithElementsAndGrades = await Promise.all(
      criteriaResult.rows.map(async (criterion) => {
        const elementsResult = await db.query('SELECT ea.id, ea.nome, ea.ponderacao, ea.cotacao_maxima, ea.ativo FROM elemento_avaliacao ea WHERE ea.criterio_id = $1 AND ea.ativo = true ORDER BY ea.nome', [criterion.id]);
        const elementsWithGrades = await Promise.all(
          elementsResult.rows.map(async (element) => {
            const gradesResult = await db.query('SELECT ne.id, ne.aluno_id, ne.nota, ne.falta FROM nota_elemento ne WHERE ne.elemento_avaliacao_id = $1', [element.id]);
            return {
              ...element,
              notas: gradesResult.rows.map(row => ({ ...row, nota: parseFloat(row.nota) })),
            };
          })
        );
        return { ...criterion, elementos: elementsWithGrades };
      })
    );

    res.json({
      dossie: (await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId])).rows[0],
      students: studentsResult.rows,
      criteria: criteriaWithElementsAndGrades,
    });

  } catch (error) {
    next(error);
  }
});


module.exports = router;

