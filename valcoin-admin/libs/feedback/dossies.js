const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ==================== DOSSIÊS CRUD ====================

/**
 * GET /api/svelte/dossies/:professorDisciplinaTurmaId/pesquisa
 * Busca todos os dossiês de uma disciplina específica do professor
 */
router.get('/:professorDisciplinaTurmaId/pesquisa', async (req, res) => {
  try {
    const { professorDisciplinaTurmaId } = req.params;
    const userId = req.user.id;
    
    // Verificar se a disciplina pertence ao professor
    const disciplinaCheck = await db.query(
      'SELECT * FROM professor_disciplina_turma WHERE id = $1 AND professor_id = $2',
      [professorDisciplinaTurmaId, userId]
    );
    
    if (disciplinaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Professor disciplina turma not found or access denied' });
    }
    
    // Buscar dossiês da disciplina
    const dossiesResult = await db.query(
      'SELECT * FROM dossie WHERE professor_disciplina_turma_id = $1 ORDER BY data_inicio DESC, nome',
      [professorDisciplinaTurmaId]
    );
    
    res.json({
      professorDisciplinaTurma: disciplinaCheck.rows[0],
      dossies: dossiesResult.rows
    });
  } catch (error) {
    console.error(error);
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
    
    // Verificar se a disciplina pertence ao professor
    const disciplinaCheck = await db.query(
      'SELECT id FROM professor_disciplina_turma WHERE id = $1 AND professor_id = $2 AND ativo = true',
      [professor_disciplina_turma_id, userId]
    );
    
    if (disciplinaCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or disciplina not active' });
    }
    
    // Validar datas se fornecidas
    if (data_inicio && data_fim && new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'data_inicio must be before data_fim' 
      });
    }
    
    // Criar dossiê
    const result = await db.query(
      'INSERT INTO dossie (nome, descricao, professor_disciplina_turma_id, data_inicio, data_fim, ativo, escala_avaliacao) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [nome, descricao, professor_disciplina_turma_id, data_inicio || null, data_fim || null, ativo, escala_avaliacao || 20]
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
    
    // Validação
    if (!nome) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'nome is required' 
      });
    }
    
    // Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.* 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    // Validar datas se fornecidas
    if (data_inicio && data_fim && new Date(data_inicio) > new Date(data_fim)) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'data_inicio must be before data_fim' 
      });
    }
    
    // Atualizar dossiê
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
    
    // Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.* 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    if (hard === 'true') {
      // Hard delete (remove permanentemente)
      await db.query('DELETE FROM dossie WHERE id = $1', [dossieId]);
    } else {
      // Soft delete (marca como inativo)
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
 * Lista todos os dossiês do professor autenticado
 * Agrupados por disciplina
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { apenas_ativos = true } = req.query;
    
    // Buscar disciplinas do professor
    const disciplinasResult = await db.query(
      'SELECT * FROM professor_disciplina_turma WHERE professor_id = $1 AND ativo = true ORDER BY disciplina_turma_id',
      [userId]
    );
    
    // Para cada disciplina, buscar seus dossiês
    const result = await Promise.all(
      disciplinasResult.rows.map(async (disciplina) => {
        const whereClause = apenas_ativos === 'true' 
          ? 'WHERE professor_disciplina_turma_id = $1 AND ativo = true' 
          : 'WHERE professor_disciplina_turma_id = $1';
        
        const dossiesResult = await db.query(
          `SELECT * FROM dossie ${whereClause} ORDER BY data_inicio DESC, nome`,
          [disciplina.id]
        );
        
        return {
          professorDisciplinaTurma: disciplina,
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
 * Inclui: disciplina, alunos, critérios e contadores
 */
router.get('/:dossieId/pesquisa', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id;
    
    // Buscar dossiê com verificação de acesso
    const dossieResult = await db.query(`
      SELECT d.*, pdt.disciplina_turma_id
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    const dossie = dossieResult.rows[0];
    
    // Buscar critérios do dossiê
    const criteriosResult = await db.query(
      'SELECT * FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem, nome',
      [dossieId]
    );
    
    // Buscar elementos de avaliação
    const elementosResult = await db.query(`
      SELECT ea.*, c.nome as criterio_nome
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      WHERE c.dossie_id = $1 AND ea.ativo = true
      ORDER BY c.ordem, ea.nome
    `, [dossieId]);
    
    // Buscar contadores do dossiê
    const contadoresResult = await db.query(
      'SELECT * FROM contador WHERE dossie_id = $1 AND ativo = true ORDER BY tipo, shortname',
      [dossieId]
    );
    
    // Buscar alunos da turma (assumindo que existe uma tabela de alunos)
    // NOTA: Ajustar conforme a estrutura real da sua base de dados
    const alunosResult = await db.query(`
      SELECT u.* 
      FROM users u
      JOIN aluno_turma at ON u.id = at.aluno_id
      WHERE at.turma_id = (SELECT turma_id FROM disciplina_turma WHERE id = $1)
        AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.nome
    `, [dossie.disciplina_turma_id]);
    
    res.json({
      dossie: {
        id: dossie.id,
        nome: dossie.nome,
        descricao: dossie.descricao,
        data_inicio: dossie.data_inicio,
        data_fim: dossie.data_fim,
        ativo: dossie.ativo,
        created_at: dossie.created_at,
        updated_at: dossie.updated_at
      },
      professorDisciplinaTurma: {
        id: dossie.professor_disciplina_turma_id,
        disciplina_turma_id: dossie.disciplina_turma_id
      },
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
    
    // Verificar acesso
    const dossieCheck = await db.query(`
      SELECT d.* 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    // Usar a view criada no schema
    const resumoResult = await db.query(
      'SELECT * FROM v_dossie_resumo WHERE id = $1',
      [dossieId]
    );
    
    // Contar notas registradas
    const notasCount = await db.query(`
      SELECT COUNT(*) as total 
      FROM nota_elemento ne
      JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
      JOIN criterio c ON c.id = ea.criterio_id
      WHERE c.dossie_id = $1 AND ne.nota > 0
    `, [dossieId]);
    
    // Contar registos de contadores
    const contadoresCount = await db.query(`
      SELECT COUNT(*) as total
      FROM contador_registo cr
      JOIN contador c ON c.id = cr.contador_id
      WHERE c.dossie_id = $1
    `, [dossieId]);
    
    res.json({
      dossie: dossieCheck.rows[0],
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
    
    // Verificar acesso
    const dossieCheck = await db.query(`
      SELECT d.* 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    // Buscar total de notas esperadas
    const totalEsperadoResult = await db.query(`
      SELECT COUNT(*) as total
      FROM nota_elemento ne
      JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
      JOIN criterio c ON c.id = ea.criterio_id
      WHERE c.dossie_id = $1
    `, [dossieId]);
    
    // Buscar total de notas atribuídas
    const totalAtribuidasResult = await db.query(`
      SELECT COUNT(*) as total
      FROM nota_elemento ne
      JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
      JOIN criterio c ON c.id = ea.criterio_id
      WHERE c.dossie_id = $1 AND ne.nota > 0
    `, [dossieId]);
    
    const totalEsperado = parseInt(totalEsperadoResult.rows[0].total);
    const totalAtribuidas = parseInt(totalAtribuidasResult.rows[0].total);
    const percentagem = totalEsperado > 0 
      ? Math.round((totalAtribuidas / totalEsperado) * 100) 
      : 0;
    
    res.json({
      dossie: dossieCheck.rows[0],
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
    
    // Usar transação para garantir consistência
    const result = await db.withTransaction(async (client) => {
      // Buscar dossiê original com verificação de acesso
      const dossieOriginal = await client.query(`
        SELECT d.* 
        FROM dossie d
        JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
        WHERE d.id = $1 AND pdt.professor_id = $2
      `, [dossieId, userId]);
      
      if (dossieOriginal.rows.length === 0) {
        throw new Error('Dossie not found or access denied');
      }
      
      const original = dossieOriginal.rows[0];
      
      // Criar novo dossiê
      const novoDossie = await client.query(
        'INSERT INTO dossie (nome, descricao, professor_disciplina_turma_id, data_inicio, data_fim) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [novoNome, original.descricao, original.professor_disciplina_turma_id, null, null]
      );
      
      // Buscar critérios do dossiê original
      const criteriosOriginais = await client.query(
        'SELECT * FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem',
        [dossieId]
      );
      
      // Duplicar critérios e elementos
      for (const criterio of criteriosOriginais.rows) {
        const novoCriterio = await client.query(
          'INSERT INTO criterio (nome, descricao, ponderacao, dossie_id, ordem) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [criterio.nome, criterio.descricao, criterio.ponderacao, novoDossie.rows[0].id, criterio.ordem]
        );
        
        // Buscar elementos do critério
        const elementosOriginais = await client.query(
          'SELECT * FROM elemento_avaliacao WHERE criterio_id = $1 AND ativo = true',
          [criterio.id]
        );
        
        // Duplicar elementos
        for (const elemento of elementosOriginais.rows) {
          const novoElemento = await client.query(
            'INSERT INTO elemento_avaliacao (nome, descricao, tipo, ponderacao, criterio_id, cotacao_maxima) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [elemento.nome, elemento.descricao, elemento.tipo, elemento.ponderacao, novoCriterio.rows[0].id, elemento.cotacao_maxima]
          );
          
          // Se copiarNotas = true, buscar alunos e criar notas vazias
          if (!copiarNotas) {
            // Buscar alunos da turma
            const alunosResult = await client.query(`
              SELECT aluno_id AS id
              FROM aluno_disciplina
              WHERE disciplina_turma_id = (
                SELECT disciplina_turma_id 
                FROM professor_disciplina_turma 
                WHERE id = $1
              )
            `, [original.professor_disciplina_turma_id]);
            
            // Criar notas vazias para cada aluno
            for (const aluno of alunosResult.rows) {
              await client.query(
                'INSERT INTO nota_elemento (elemento_avaliacao_id, aluno_id, nota) VALUES ($1, $2, $3)',
                [novoElemento.rows[0].id, aluno.id, 0]
              );
            }
          }
        }
      }
      
      // Duplicar contadores
      const contadoresOriginais = await client.query(
        'SELECT * FROM contador WHERE dossie_id = $1 AND ativo = true',
        [dossieId]
      );
      
      for (const contador of contadoresOriginais.rows) {
        await client.query(
          'INSERT INTO contador (shortname, descritor, tipo, incremento, dossie_id, cor, icone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [contador.shortname, contador.descritor, contador.tipo, contador.incremento, novoDossie.rows[0].id, contador.cor, contador.icone]
        );
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
    
    // Verificar acesso
    const dossieCheck = await db.query(`
      SELECT d.* 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2
    `, [dossieId, userId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found or access denied' });
    }
    
    // Validar ponderações dos critérios
    const somaPonderacoes = await db.query(
      'SELECT COALESCE(SUM(ponderacao), 0) as total FROM criterio WHERE dossie_id = $1 AND ativo = true',
      [dossieId]
    );
    
    const total = parseFloat(somaPonderacoes.rows[0].total);
    const ponderacoesValidas = total === 100;
    
    // Verificar se todos os critérios têm elementos
    const criteriosSemElementos = await db.query(`
      SELECT c.id, c.nome
      FROM criterio c
      LEFT JOIN elemento_avaliacao ea ON ea.criterio_id = c.id AND ea.ativo = true
      WHERE c.dossie_id = $1 AND c.ativo = true
      GROUP BY c.id, c.nome
      HAVING COUNT(ea.id) = 0
    `, [dossieId]);
    
    res.json({
      dossie: dossieCheck.rows[0],
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

    // 1. Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.*, pdt.disciplina_turma_id
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [dossieId, userId]);

    if (dossieCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or dossie not active' });
    }

    const dossie = dossieCheck.rows[0];
    const disciplinaTurmaId = dossie.disciplina_turma_id;

    // 2. Buscar todos os alunos da turma
    const studentsResult = await db.query(`
      SELECT u.id, u.nome, u.numero_mecanografico
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      WHERE ad.disciplina_turma_id = $1 AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.nome
    `, [disciplinaTurmaId]);

    // 3. Buscar todos os critérios do dossiê
    const criteriaResult = await db.query(
      'SELECT id, nome, ponderacao FROM criterio WHERE dossie_id = $1 AND ativo = true ORDER BY ordem, nome',
      [dossieId]
    );

    // 4. Para cada critério, buscar os elementos de avaliação (instrumentos) e suas notas
    const criteriaWithElementsAndGrades = await Promise.all(
      criteriaResult.rows.map(async (criterion) => {
        const elementsResult = await db.query(
          'SELECT ea.id, ea.nome, ea.ponderacao, ea.cotacao_maxima, ea.ativo FROM elemento_avaliacao ea WHERE ea.criterio_id = $1 AND ea.ativo = true ORDER BY ea.nome',
          [criterion.id]
        );

        const elementsWithGrades = await Promise.all(
          elementsResult.rows.map(async (element) => {
            const gradesResult = await db.query(
              'SELECT ne.id, ne.aluno_id, ne.nota, ne.falta FROM nota_elemento ne WHERE ne.elemento_avaliacao_id = $1',
              [element.id]
            );
            return {
              ...element,
              notas: gradesResult.rows.map(row => ({ ...row, nota: parseFloat(row.nota) })), // Ensure nota is a number
            };
          })
        );

        return {
          ...criterion,
          elementos: elementsWithGrades,
        };
      })
    );

    res.json({
      dossie: dossie,
      students: studentsResult.rows,
      criteria: criteriaWithElementsAndGrades,
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
