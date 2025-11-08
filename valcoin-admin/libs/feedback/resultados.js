const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ==================== RESULTADOS - CÁLCULO DE NOTAS ====================

/**
 * GET /api/svelte/resultados/:dossieId/:alunoId
 * Busca resultados de um aluno num dossiê específico
 * Retorna todos os elementos com notas e critérios
 */
router.get('/resultados/:dossieId/:alunoId', async (req, res, next) => {
  try {
    const { dossieId, alunoId } = req.params;
    
    // Verificar se dossiê existe
    const dossieCheck = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    // Verificar se aluno existe
    const alunoCheck = await db.query('SELECT * FROM users WHERE id = $1 AND tipo_utilizador = \'ALUNO\'', [alunoId]);
    if (alunoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno not found' });
    }
    
    // Buscar todos os elementos do dossiê com notas do aluno
    const result = await db.query(`
      SELECT 
        ea.*,
        ne.nota,
        ne.falta,
        ne.observacoes as nota_observacoes,
        c.id as criterio_id,
        c.nome as criterio_nome,
        c.ponderacao as criterio_ponderacao
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id AND ne.aluno_id = $2
      WHERE c.dossie_id = $1 AND ea.ativo = true AND c.ativo = true
      ORDER BY c.ordem, ea.data_avaliacao DESC NULLS LAST, ea.nome
    `, [dossieId, alunoId]);
    
    // Agrupar por critério
    const porCriterio = {};
    
    result.rows.forEach(row => {
      if (!porCriterio[row.criterio_id]) {
        porCriterio[row.criterio_id] = {
          criterio: {
            id: row.criterio_id,
            nome: row.criterio_nome,
            ponderacao: row.criterio_ponderacao
          },
          elementos: []
        };
      }
      
      porCriterio[row.criterio_id].elementos.push({
        id: row.id,
        nome: row.nome,
        tipo: row.tipo,
        ponderacao: row.ponderacao,
        cotacao_maxima: row.cotacao_maxima,
        data_avaliacao: row.data_avaliacao,
        nota: row.nota || 0,
        falta: row.falta || false,
        observacoes: row.nota_observacoes
      });
    });
    
    res.json({
      dossie: dossieCheck.rows[0],
      aluno: alunoCheck.rows[0],
      resultadosPorCriterio: Object.values(porCriterio)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/resultados/:dossieId/:alunoId/calculado
 * Calcula a nota final do aluno no dossiê
 * Aplica ponderações dos critérios e elementos
 */
router.get('/resultados/:dossieId/:alunoId/calculado', async (req, res, next) => {
  try {
    const { dossieId, alunoId } = req.params;
    
    // Verificar acesso
    const dossieCheck = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    const alunoCheck = await db.query('SELECT * FROM users WHERE id = $1 AND tipo_utilizador = \'ALUNO\'', [alunoId]);
    if (alunoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno not found' });
    }
    
    // Usar função SQL do schema para calcular
    const notaFinalResult = await db.query(
      'SELECT calcular_nota_dossie($1, $2) as nota_final',
      [dossieId, aluno.id]
    );
    
    const notaFinal = parseFloat(notaFinalResult.rows[0].nota_final) || 0;
    
    // Buscar detalhes por critério
    const criteriosResult = await db.query(`
      SELECT 
        c.id,
        c.nome,
        c.ponderacao,
        calcular_nota_criterio(c.id, $2) as nota_criterio
      FROM criterio c
      WHERE c.dossie_id = $1 AND c.ativo = true
      ORDER BY c.ordem
    `, [dossieId, alunoId]);
    
    // Buscar elementos por critério
    const resultadosPorCriterio = await Promise.all(
      criteriosResult.rows.map(async (criterio) => {
        const elementosResult = await db.query(`
          SELECT 
            ea.id,
            ea.nome,
            ea.tipo,
            ea.ponderacao,
            ea.cotacao_maxima,
            COALESCE(ne.nota, 0) as nota,
            ne.falta
          FROM elemento_avaliacao ea
          LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id AND ne.aluno_id = $2
          WHERE ea.criterio_id = $1 AND ea.ativo = true
          ORDER BY ea.data_avaliacao DESC NULLS LAST, ea.nome
        `, [criterio.id, alunoId]);
        
        return {
          criterio: {
            id: criterio.id,
            nome: criterio.nome,
            ponderacao: parseFloat(criterio.ponderacao)
          },
          notaCriterio: parseFloat(criterio.nota_criterio),
          elementos: elementosResult.rows,
          totalElementos: elementosResult.rows.length
        };
      })
    );
    
    // Calcular soma de ponderações
    const somaPonderacoes = criteriosResult.rows.reduce(
      (sum, c) => sum + parseFloat(c.ponderacao), 0
    );
    
    res.json({
      dossie: dossieCheck.rows[0],
      aluno: alunoCheck.rows[0],
      notaFinal,
      somaPonderacoesCriterios: somaPonderacoes,
      isValidoPonderacoes: somaPonderacoes === 100,
      resultadosPorCriterio,
      totalCriterios: criteriosResult.rows.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/resultados/turma
 * Calcula notas finais de todos os alunos no dossiê
 */
router.get('/dossie/:dossieId/resultados/turma', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    
    // Buscar dossiê
    const dossieResult = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    const dossie = dossieResult.rows[0];
    
    // Buscar alunos da turma
    const alunosResult = await db.query(`
      SELECT * FROM users 
      WHERE tipo_utilizador = 'ALUNO' AND id IN (
        SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = $1
      )
      ORDER BY nome
    `, [dossie.disciplina_turma_id]);
    
    // Calcular nota para cada aluno usando função SQL
    const resultados = await Promise.all(
      alunosResult.rows.map(async (aluno) => {
        const notaResult = await db.query(
          'SELECT calcular_nota_dossie($1, $2) as nota_final',
          [dossieId, aluno.id]
        );
        
        // Contar elementos avaliados
        const progressoResult = await db.query(`
          SELECT 
            COUNT(*) as total_elementos,
            COUNT(*) FILTER (WHERE ne.nota > 0) as elementos_avaliados
          FROM elemento_avaliacao ea
          JOIN criterio c ON c.id = ea.criterio_id
          LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id AND ne.aluno_id = $2
          WHERE c.dossie_id = $1 AND ea.ativo = true AND c.ativo = true
        `, [dossie.id, aluno.id]);
        
        return {
          aluno: {
            id: aluno.id,
            name: aluno.nome,
            numero: aluno.numero_mecanografico
          },
          notaFinal: parseFloat(notaResult.rows[0].nota_final) || 0,
          totalElementos: parseInt(progressoResult.rows[0].total_elementos),
          elementosAvaliados: parseInt(progressoResult.rows[0].elementos_avaliados)
        };
      })
    );
    
    // Ordenar por nota final (decrescente)
    resultados.sort((a, b) => b.notaFinal - a.notaFinal);
    
    res.json({
      dossie: {
        id: dossie.id,
        nome: dossie.nome,
        descricao: dossie.descricao
      },
      resultados
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/estatisticas
 * Estatísticas globais do dossiê
 */
router.get('/dossie/:dossieId/estatisticas', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    
    // Buscar dossiê
    const dossieResult = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    const dossie = dossieResult.rows[0];
    
    // Buscar alunos
    const alunosResult = await db.query('SELECT id FROM users WHERE tipo_utilizador = \'ALUNO\' AND id IN (SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = $1)', [dossie.disciplina_turma_id]);
    
    // Calcular notas finais
    const notas = [];
    
    for (const aluno of alunosResult.rows) {
      const notaResult = await db.query(
        'SELECT calcular_nota_dossie($1, $2) as nota_final',
        [dossieId, aluno.id]
      );
      
      const nota = parseFloat(notaResult.rows[0].nota_final);
      if (nota > 0) {
        notas.push(nota);
      }
    }
    
    // Calcular estatísticas
    if (notas.length === 0) {
      return res.json({
        dossie: dossieResult.rows[0],
        totalAlunos: alunosResult.rows.length,
        alunosAvaliados: 0,
        media: 0,
        mediana: 0,
        minimo: 0,
        maximo: 0,
        desvioPadrao: 0
      });
    }
    
    notas.sort((a, b) => a - b);
    
    const media = notas.reduce((sum, n) => sum + n, 0) / notas.length;
    const mediana = notas.length % 2 === 0
      ? (notas[notas.length / 2 - 1] + notas[notas.length / 2]) / 2
      : notas[Math.floor(notas.length / 2)];
    
    const variancia = notas.reduce((sum, n) => sum + Math.pow(n - media, 2), 0) / notas.length;
    const desvioPadrao = Math.sqrt(variancia);
    
    res.json({
      dossie: dossieResult.rows[0],
      totalAlunos: alunosResult.rows.length,
      alunosAvaliados: notas.length,
      media: Math.round(media * 100) / 100,
      mediana: Math.round(mediana * 100) / 100,
      minimo: Math.round(Math.min(...notas) * 100) / 100,
      maximo: Math.round(Math.max(...notas) * 100) / 100,
      desvioPadrao: Math.round(desvioPadrao * 100) / 100,
      distribuicao: {
        '<10': notas.filter(n => n < 10).length,
        '10-14': notas.filter(n => n >= 10 && n < 14).length,
        '14-17': notas.filter(n => n >= 14 && n < 17).length,
        '>=17': notas.filter(n => n >= 17).length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/criterio/:criterioId/resultados
 * Resultados por critério específico
 */
router.get('/criterio/:criterioId/resultados', async (req, res, next) => {
  try {
    const { criterioId } = req.params;
    
    // Buscar critério e verificar acesso
    const criterioResult = await db.query('SELECT * FROM criterio WHERE id = $1', [criterioId]);
    
    if (criterioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Criterio not found' });
    }
    
    const criterio = criterioResult.rows[0];
    
    // Buscar alunos
    const alunosResult = await db.query('SELECT * FROM users WHERE tipo_utilizador = \'ALUNO\' AND id IN (SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = $1)', [criterio.disciplina_turma_id]);
    
    // Calcular média por aluno neste critério usando função SQL
    const resultados = await Promise.all(
      alunosResult.rows.map(async (aluno) => {
        const notaResult = await db.query(
          'SELECT calcular_nota_criterio($1, $2) as media_criterio',
          [criterioId, aluno.id]
        );
        
        const elementosResult = await db.query('SELECT COUNT(*) as total FROM elemento_avaliacao WHERE criterio_id = $1 AND ativo = true', [criterioId]);
        
        const avaliadosResult = await db.query(`
          SELECT COUNT(*) as total
          FROM nota_elemento ne
          JOIN elemento_avaliacao ea ON ea.id = ne.elemento_avaliacao_id
          WHERE ea.criterio_id = $1 AND ne.aluno_id = $2 AND ne.nota > 0
        `, [criterioId, aluno.id]);
        
        return {
          aluno: {
            id: aluno.id,
            name: aluno.nome,
                        numero: aluno.numero_mecanografico          },
          mediaCriterio: parseFloat(notaResult.rows[0].media_criterio) || 0,
          totalElementos: parseInt(elementosResult.rows[0].total),
          elementosAvaliados: parseInt(avaliadosResult.rows[0].total)
        };
      })
    );
    
    // Ordenar por média
    resultados.sort((a, b) => b.mediaCriterio - a.mediaCriterio);
    
    res.json({
      criterio: {
        id: criterio.id,
        nome: criterio.nome,
        ponderacao: criterio.ponderacao,
        descricao: criterio.descricao
      },
      resultados
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/aluno/:alunoId/resultados/dossie/:dossieId/detalhado
 * Resultados detalhados de um aluno num dossiê (para boletim/pauta)
 */
router.get('/aluno/:alunoId/resultados/dossie/:dossieId/detalhado', async (req, res, next) => {
  try {
    const { alunoId, dossieId } = req.params;
    
    // Verificar acesso
    const dossieCheck = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    const alunoCheck = await db.query('SELECT * FROM users WHERE id = $1 AND tipo_utilizador = \'ALUNO\'', [alunoId]);
    if (alunoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno not found' });
    }
    
    // Buscar todos os critérios com elementos e notas
    const criteriosResult = await db.query(`
      SELECT 
        c.id as criterio_id,
        c.nome as criterio_nome,
        c.ponderacao as criterio_ponderacao,
        calcular_nota_criterio(c.id, $2) as nota_criterio,
        ea.id as elemento_id,
        ea.nome as elemento_nome,
        ea.tipo as elemento_tipo,
        ea.ponderacao as elemento_ponderacao,
        ea.cotacao_maxima,
        ea.data_avaliacao,
        COALESCE(ne.nota, 0) as nota,
        ne.falta,
        ne.observacoes
      FROM criterio c
      LEFT JOIN elemento_avaliacao ea ON ea.criterio_id = c.id AND ea.ativo = true
      LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id AND ne.aluno_id = $2
      WHERE c.dossie_id = $1 AND c.ativo = true
      ORDER BY c.ordem, ea.data_avaliacao DESC NULLS LAST, ea.nome
    `, [dossieId, alunoId]);
    
    // Agrupar por critério
    const criteriosMap = {};
    
    criteriosResult.rows.forEach(row => {
      if (!criteriosMap[row.criterio_id]) {
        criteriosMap[row.criterio_id] = {
          criterio: {
            id: row.criterio_id,
            nome: row.criterio_nome,
            ponderacao: parseFloat(row.criterio_ponderacao)
          },
          notaCriterio: parseFloat(row.nota_criterio),
          elementos: []
        };
      }
      
      if (row.elemento_id) {
        criteriosMap[row.criterio_id].elementos.push({
          id: row.elemento_id,
          nome: row.elemento_nome,
          tipo: row.elemento_tipo,
          ponderacao: parseFloat(row.elemento_ponderacao),
          cotacao_maxima: parseFloat(row.cotacao_maxima),
          data_avaliacao: row.data_avaliacao,
          nota: parseFloat(row.nota),
          falta: row.falta,
          observacoes: row.observacoes
        });
      }
    });
    
    // Calcular nota final
    const notaFinalResult = await db.query(
      'SELECT calcular_nota_dossie($1, $2) as nota_final',
      [dossieId, alunoId]
    );
    
    res.json({
      dossie: dossieCheck.rows[0],
      aluno: alunoCheck.rows[0],
      notaFinal: parseFloat(notaFinalResult.rows[0].nota_final),
      criterios: Object.values(criteriosMap)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/aluno/:alunoId/resultados/professor/:professorDisciplinaTurmaId
 * Todos os resultados de um aluno numa disciplina (todos os dossiês)
 */
router.get('/aluno/:alunoId/resultados/professor/:professorDisciplinaTurmaId', async (req, res, next) => {
  try {
    const { alunoId, professorDisciplinaTurmaId } = req.params;
    
    // Verificar acesso
    const disciplinaCheck = await db.query(
      'SELECT * FROM professor_disciplina_turma WHERE id = $1',
      [professorDisciplinaTurmaId]
    );
    
    if (disciplinaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Disciplina not found' });
    }
    
    const alunoCheck = await db.query('SELECT * FROM users WHERE id = $1 AND tipo_utilizador = \'ALUNO\'', [alunoId]);
    if (alunoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aluno not found' });
    }
    
    // Buscar todos os dossiês da disciplina
    const dossiesResult = await db.query(
      'SELECT * FROM dossie WHERE professor_disciplina_turma_id = $1 AND ativo = true ORDER BY data_inicio DESC, nome',
      [professorDisciplinaTurmaId]
    );
    
    // Calcular nota para cada dossiê
    const resultadosPorDossie = await Promise.all(
      dossiesResult.rows.map(async (dossie) => {
        const notaResult = await db.query(
          'SELECT calcular_nota_dossie($1, $2) as nota_final',
          [dossie.id, aluno.id]
        );
        
        const progressoResult = await db.query(`
          SELECT 
            COUNT(*) as total_elementos,
            COUNT(*) FILTER (WHERE ne.nota > 0) as elementos_avaliados
          FROM elemento_avaliacao ea
          JOIN criterio c ON c.id = ea.criterio_id
          LEFT JOIN nota_elemento ne ON ne.elemento_avaliacao_id = ea.id AND ne.aluno_id = $2
          WHERE c.dossie_id = $1 AND ea.ativo = true AND c.ativo = true
        `, [dossie.id, aluno.id]);
        
        return {
          dossie: {
            id: dossie.id,
            nome: dossie.nome,
            data_inicio: dossie.data_inicio,
            data_fim: dossie.data_fim
          },
          notaFinal: parseFloat(notaResult.rows[0].nota_final) || 0,
          totalElementos: parseInt(progressoResult.rows[0].total_elementos),
          elementosAvaliados: parseInt(progressoResult.rows[0].elementos_avaliados)
        };
      })
    );
    
    res.json({
      aluno: alunoCheck.rows[0],
      professorDisciplinaTurma: disciplinaCheck.rows[0],
      resultadosPorDossie
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/svelte/dossie/:dossieId/exportar
 * Exporta resultados do dossiê em formato CSV
 */
router.post('/dossie/:dossieId/exportar', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    
    // Buscar dossiê
    const dossieResult = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    const dossie = dossieResult.rows[0];
    
    // Buscar elementos
    const elementosResult = await db.query(`
      SELECT ea.*, c.nome as criterio_nome
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      WHERE c.dossie_id = $1 AND ea.ativo = true AND c.ativo = true
      ORDER BY c.ordem, ea.nome
    `, [dossieId]);
    
    // Buscar alunos
    const alunosResult = await db.query('SELECT * FROM users WHERE tipo_utilizador = \'ALUNO\' AND id IN (SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = $1) ORDER BY nome', [dossie.disciplina_turma_id]);
    
    // Montar dados CSV
    const csvData = [];
    
    // Header
    const header = ['Número', 'Nome', ...elementosResult.rows.map(e => e.nome), 'Nota Final'];
    csvData.push(header);
    
    // Linhas com alunos
    for (const aluno of alunosResult.rows) {
      const row = [aluno.numero_mecanografico, aluno.nome];
      
      // Notas de cada elemento
      for (const elemento of elementosResult.rows) {
        const notaResult = await db.query(
          'SELECT nota FROM nota_elemento WHERE elemento_avaliacao_id = $1 AND aluno_id = $2',
          [elemento.id, aluno.id]
        );
        
        row.push(notaResult.rows[0]?.nota || 0);
      }
      
      // Calcular nota final
      const notaFinalResult = await db.query(
        'SELECT calcular_nota_dossie($1, $2) as nota_final',
        [dossieId, aluno.id]
      );
      
      row.push(parseFloat(notaFinalResult.rows[0].nota_final) || 0);
      csvData.push(row);
    }
    
    res.json({
      dossie: {
        nome: dossie.nome,
        descricao: dossie.descricao
      },
      csvData,
      totalAlunos: alunosResult.rows.length,
      totalElementos: elementosResult.rows.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/pauta
 * Gera pauta completa do dossiê (todos os alunos, todos os elementos)
 */
router.get('/dossie/:dossieId/pauta', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    
    // Buscar dossiê
    const dossieResult = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieResult.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    const dossie = dossieResult.rows[0];
    
    // Buscar critérios com elementos
    const criteriosResult = await db.query(`
      SELECT 
        c.id as criterio_id,
        c.nome as criterio_nome,
        c.ponderacao as criterio_ponderacao,
        c.ordem,
        ea.id as elemento_id,
        ea.nome as elemento_nome,
        ea.tipo,
        ea.ponderacao as elemento_ponderacao
      FROM criterio c
      LEFT JOIN elemento_avaliacao ea ON ea.criterio_id = c.id AND ea.ativo = true
      WHERE c.dossie_id = $1 AND c.ativo = true
      ORDER BY c.ordem, ea.data_avaliacao DESC NULLS LAST, ea.nome
    `, [dossieId]);
    
    // Buscar alunos
    const alunosResult = await db.query('SELECT * FROM users WHERE tipo_utilizador = \'ALUNO\' AND id IN (SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = $1) ORDER BY numero_mecanografico, nome', [dossie.disciplina_turma_id]);
    
    // Organizar estrutura de critérios e elementos
    const criteriosMap = {};
    criteriosResult.rows.forEach(row => {
      if (!criteriosMap[row.criterio_id]) {
        criteriosMap[row.criterio_id] = {
          id: row.criterio_id,
          nome: row.criterio_nome,
          ponderacao: parseFloat(row.criterio_ponderacao),
          ordem: row.ordem,
          elementos: []
        };
      }
      
      if (row.elemento_id) {
        criteriosMap[row.criterio_id].elementos.push({
          id: row.elemento_id,
          nome: row.elemento_nome,
          tipo: row.tipo,
          ponderacao: parseFloat(row.elemento_ponderacao)
        });
      }
    });
    
    const criterios = Object.values(criteriosMap);
    
    // Calcular resultados para cada aluno
    const pauta = await Promise.all(
      alunosResult.rows.map(async (aluno) => {
        // Notas por critério
        const notasPorCriterio = await Promise.all(
          criterios.map(async (criterio) => {
            const notaCriterioResult = await db.query(
              'SELECT calcular_nota_criterio($1, $2) as nota',
              [criterio.id, aluno.id]
            );
            
            // Notas de cada elemento do critério
            const notasElementos = await Promise.all(
              criterio.elementos.map(async (elemento) => {
                const notaResult = await db.query(
                  'SELECT nota, falta FROM nota_elemento WHERE elemento_avaliacao_id = $1 AND aluno_id = $2',
                  [elemento.id, aluno.id]
                );
                
                return {
                  elementoId: elemento.id,
                  elementoNome: elemento.nome,
                  nota: notaResult.rows[0]?.nota || 0,
                  falta: notaResult.rows[0]?.falta || false
                };
              })
            );
            
            return {
              criterioId: criterio.id,
              criterioNome: criterio.nome,
              ponderacao: criterio.ponderacao,
              notaCriterio: parseFloat(notaCriterioResult.rows[0].nota),
              elementos: notasElementos
            };
          })
        );
        
        // Nota final
        const notaFinalResult = await db.query(
          'SELECT calcular_nota_dossie($1, $2) as nota_final',
          [dossieId, aluno.id]
        );
        
        return {
          aluno: {
            id: aluno.id,
            numero: aluno.numero_mecanografico,
            nome: aluno.nome
          },
          criterios: notasPorCriterio,
          notaFinal: parseFloat(notaFinalResult.rows[0].nota_final)
        };
      })
    );
    
    res.json({
      dossie: {
        id: dossie.id,
        nome: dossie.nome,
        descricao: dossie.descricao,
        data_inicio: dossie.data_inicio,
        data_fim: dossie.data_fim
      },
      estrutura: {
        criterios: criterios.map(c => ({
          id: c.id,
          nome: c.nome,
          ponderacao: c.ponderacao,
          elementos: c.elementos
        }))
      },
      pauta
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/dossie/:dossieId/comparacao-criterios
 * Compara desempenho médio da turma em cada critério
 */
router.get('/dossie/:dossieId/comparacao-criterios', async (req, res, next) => {
  try {
    const { dossieId } = req.params;
    
    // Verificar acesso
    const dossieCheck = await db.query('SELECT * FROM dossie WHERE id = $1', [dossieId]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Dossie not found' });
    }
    
    const dossie = dossieCheck.rows[0];
    
    // Buscar critérios
    const criteriosResult = await db.query(`
      SELECT id, nome, ponderacao, ordem
      FROM criterio
      WHERE dossie_id = $1 AND ativo = true
      ORDER BY ordem
    `, [dossieId]);
    
    // Buscar alunos
    const alunosResult = await db.query(
      'SELECT id FROM users WHERE tipo_utilizador = \'ALUNO\' AND id IN (SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = $1)',
      [dossie.disciplina_turma_id]
    );
    
    // Calcular estatísticas por critério
    const comparacao = await Promise.all(
      criteriosResult.rows.map(async (criterio) => {
        const notas = [];
        
        for (const aluno of alunosResult.rows) {
          const notaResult = await db.query(
            'SELECT calcular_nota_criterio($1, $2) as nota',
            [criterio.id, aluno.id]
          );
          
          const nota = parseFloat(notaResult.rows[0].nota);
          if (nota > 0) {
            notas.push(nota);
          }
        }
        
        if (notas.length === 0) {
          return {
            criterio: {
              id: criterio.id,
              nome: criterio.nome,
              ponderacao: parseFloat(criterio.ponderacao)
            },
            alunosAvaliados: 0,
            media: 0,
            mediana: 0,
            minimo: 0,
            maximo: 0
          };
        }
        
        notas.sort((a, b) => a - b);
        const media = notas.reduce((sum, n) => sum + n, 0) / notas.length;
        const mediana = notas.length % 2 === 0
          ? (notas[notas.length / 2 - 1] + notas[notas.length / 2]) / 2
          : notas[Math.floor(notas.length / 2)];
        
        return {
          criterio: {
            id: criterio.id,
            nome: criterio.nome,
            ponderacao: parseFloat(criterio.ponderacao)
          },
          alunosAvaliados: notas.length,
          media: Math.round(media * 100) / 100,
          mediana: Math.round(mediana * 100) / 100,
          minimo: Math.round(Math.min(...notas) * 100) / 100,
          maximo: Math.round(Math.max(...notas) * 100) / 100
        };
      })
    );
    
    res.json({
      dossie: {
        id: dossie.id,
        nome: dossie.nome
      },
      totalAlunos: alunosResult.rows.length,
      comparacao
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/svelte/elemento/:elementoId/analise-turma
 * Análise detalhada de um elemento para toda a turma
 */
router.get('/elemento/:elementoId/analise-turma', async (req, res, next) => {
  try {
    const { elementoId } = req.params;
    
    // Verificar acesso e buscar info do elemento
    const elementoResult = await db.query(`
      SELECT 
        ea.*,
        c.nome as criterio_nome,
        d.nome as dossie_nome,
        pdt.disciplina_turma_id
      FROM elemento_avaliacao ea
      JOIN criterio c ON c.id = ea.criterio_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE ea.id = $1
    `, [elementoId]);
    
    if (elementoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Elemento not found' });
    }
    
    const elemento = elementoResult.rows[0];
    
    // Buscar todas as notas
    const notasResult = await db.query(`
      SELECT 
        u.id,
        u.numero_mecanografico as numero,
        u.nome,
        ne.nota,
        ne.falta,
        ne.observacoes
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      LEFT JOIN nota_elemento ne ON ne.aluno_id = u.id AND ne.elemento_avaliacao_id = $1
      WHERE ad.disciplina_turma_id = $2 AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.numero_mecanografico, u.nome
    `, [elementoId, elemento.disciplina_turma_id]);
    
    // Calcular estatísticas
    const notas = notasResult.rows
      .filter(r => !r.falta && r.nota > 0)
      .map(r => parseFloat(r.nota));
    
    let estatisticas = {
      totalAlunos: notasResult.rows.length,
      alunosAvaliados: notas.length,
      faltas: notasResult.rows.filter(r => r.falta).length,
      media: 0,
      mediana: 0,
      minimo: 0,
      maximo: 0
    };
    
    if (notas.length > 0) {
      notas.sort((a, b) => a - b);
      const media = notas.reduce((sum, n) => sum + n, 0) / notas.length;
      const mediana = notas.length % 2 === 0
        ? (notas[notas.length / 2 - 1] + notas[notas.length / 2]) / 2
        : notas[Math.floor(notas.length / 2)];
      
      estatisticas = {
        ...estatisticas,
        media: Math.round(media * 100) / 100,
        mediana: Math.round(mediana * 100) / 100,
        minimo: Math.round(Math.min(...notas) * 100) / 100,
        maximo: Math.round(Math.max(...notas) * 100) / 100
      };
    }
    
    res.json({
      elemento: {
        id: elemento.id,
        nome: elemento.nome,
        tipo: elemento.tipo,
        cotacao_maxima: parseFloat(elemento.cotacao_maxima),
        data_avaliacao: elemento.data_avaliacao,
        criterio: elemento.criterio_nome,
        dossie: elemento.dossie_nome
      },
      estatisticas,
      notas: notasResult.rows
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;