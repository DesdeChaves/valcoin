const express = require('express');
const router = express.Router();
const db = require('../db.js');
const { _createTransaction } = require('../transactions'); // Import the internal transaction creation function

// ==================== CONTADORES CRUD ====================

/**
 * GET /api/svelte/contador/:disciplinaId/pesquisa
 * Busca todos os contadores de uma disciplina específica
 */
router.get('/contador/:dossieId/pesquisa', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id; // Assuming userId is available from authentication middleware

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
    
    // Buscar contadores do dossiê
    const contadoresResult = await db.query(
      'SELECT * FROM contador WHERE dossie_id = $1 ORDER BY tipo, shortname',
      [dossieId]
    );
    
    res.json({
      dossie: dossieCheck.rows[0],
      contadores: contadoresResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/contadore/:contadorId/search
 * Busca um contador específico
 */
router.get('/contadore/:contadorId/search', async (req, res) => {
  try {
    const { contadorId } = req.params;
    const userId = req.user.id;
    
    const result = await db.query(`
      SELECT c.* 
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Contador not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/contador/save
 * Cria um novo contador
 */
router.post('/contador/save', async (req, res) => {
  try {
    const { incremento, tipo, shortname, descritor, dossie_id, cor, icone, periodo_inativacao_segundos, modelo_calibracao, parametros_calibracao, modelo_esquecimento, parametros_esquecimento, ativo, escala } = req.body;
    
    // Validação
    if (incremento === undefined || !tipo || !shortname || !descritor || !dossie_id) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'incremento, tipo, shortname, descritor and dossie_id are required' 
      });
    }
    
    // Validar tipo
    if (!['atitudinal', 'participacao', 'experimental', 'social', 'vocacional'].includes(tipo.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'tipo must be atitudinal, participacao, experimental, social or vocacional' 
      });
    }
    
    // Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.id 
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [dossie_id, req.user.id]);
    
    if (dossieCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or dossie not active' });
    }
    
    // Criar contador
    const result = await db.query(
      'INSERT INTO contador (incremento, tipo, shortname, descritor, cor, icone, periodo_inativacao_segundos, modelo_calibracao, parametros_calibracao, modelo_esquecimento, parametros_esquecimento, ativo, dossie_id, escala, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()) RETURNING *',
      [incremento, tipo, shortname, descritor, cor || null, icone || null, periodo_inativacao_segundos, modelo_calibracao || 'nenhum', parametros_calibracao || {}, modelo_esquecimento || 'nenhum', parametros_esquecimento || {}, ativo, dossie_id, escala || 20]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/contadore/:contadorId/atualiza
 * Atualiza um contador existente
 */
router.post('/contadore/:contadorId/atualiza', async (req, res) => {
  try {
    const { contadorId } = req.params;
    const { incremento, tipo, shortname, descritor, cor, icone, periodo_inativacao_segundos, modelo_calibracao, parametros_calibracao, modelo_esquecimento, parametros_esquecimento, ativo, escala } = req.body;
    
    // Validação
    if (incremento === undefined || !tipo || !shortname || !descritor) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'incremento, tipo, shortname and descritor are required' 
      });
    }
    
    // Validar tipo
    if (!['atitudinal', 'participacao', 'experimental', 'social', 'vocacional'].includes(tipo.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: 'tipo must be atitudinal, participacao, experimental, social or vocacional' 
      });
    }
    
    // Verificar se o contador existe e pertence ao professor
    const contadorCheck = await db.query(`
      SELECT c.id
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, req.user.id]);
    
    if (contadorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or contador not found' });
    }
    
    // Atualizar contador
    const result = await db.query(
      'UPDATE contador SET incremento = $1, tipo = $2, shortname = $3, descritor = $4, cor = $5, icone = $6, periodo_inativacao_segundos = $7, modelo_calibracao = $8, parametros_calibracao = $9, modelo_esquecimento = $10, parametros_esquecimento = $11, ativo = $12, escala = $13, updated_at = NOW() WHERE id = $14 RETURNING *',
      [incremento, tipo, shortname, descritor, cor || null, icone || null, periodo_inativacao_segundos, modelo_calibracao || 'nenhum', parametros_calibracao || {}, modelo_esquecimento || 'nenhum', parametros_esquecimento || {}, ativo, escala || 20, contadorId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/contadore/:contadorId/delete
 * Deleta um contador (e seus registos em cascata)
 */
router.get('/contador/:contadorId/delete', async (req, res) => {
  try {
    const { contadorId } = req.params;
    
    // Verificar se o contador existe e pertence ao professor
    const contadorCheck = await db.query(`
      SELECT c.id
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, req.user.id]);

    if (contadorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or contador not found' });
    }
    
    // Deletar contador (cascade deve deletar NotaTap)
    await db.query('DELETE FROM contador WHERE id = $1', [contadorId]);
    
    res.status(200).json({ 
      message: 'Contador deleted successfully',
      id: contadorId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CONTADORES - REGISTOS (TAPS) ====================

/**
 * POST /api/svelte/contador/regista
 * Regista um tap/contagem para um aluno
 */
router.post('/contador/regista', async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    console.log('[REGISTA] Starting transaction for tap registration.');

    const { aluno_id, contador_id, incremento, counterName } = req.body;
    const professorId = req.user.id;

    console.log(`[REGISTA] Received tap for Aluno: ${aluno_id}, Contador: ${contador_id}, Incremento: ${incremento}, CounterName: ${counterName}`);

    // Validação
    if (!aluno_id || !contador_id || incremento === undefined || !counterName) {
      await client.query('ROLLBACK');
      console.error('[REGISTA] Validation error: Missing required fields.');
      return res.status(400).json({
        error: 'Validation error',
        details: 'aluno_id, contador_id, incremento, and counterName are required'
      });
    }

    // Verificar se aluno existe e pertence à turma do contador
    console.log('[REGISTA] Checking student and counter access...');
    const alunoCheck = await client.query(`
      SELECT u.id, u.saldo
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
      JOIN professor_disciplina_turma pdt ON dt.id = pdt.disciplina_turma_id
      JOIN dossie d ON pdt.id = d.professor_disciplina_turma_id
      JOIN contador c ON d.id = c.dossie_id
      WHERE u.id = $1 AND c.id = $2 AND pdt.professor_id = $3 AND u.tipo_utilizador = 'ALUNO'
    `, [aluno_id, contador_id, professorId]);

    if (alunoCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('[REGISTA] Access denied: Aluno not found or not in counter\'s discipline.');
      return res.status(403).json({ error: 'Access denied or Aluno not found in counter\'s discipline' });
    }
    const alunoSaldo = parseFloat(alunoCheck.rows[0].saldo);
    console.log(`[REGISTA] Aluno ${aluno_id} found with saldo: ${alunoSaldo}`);

    // Verificar se contador existe e pertence ao professor
    const contadorCheck = await client.query(`
      SELECT c.*, d.professor_disciplina_turma_id
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contador_id, professorId]);

    if (contadorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      console.error('[REGISTA] Access denied: Contador not found or not active.');
      return res.status(403).json({ error: 'Access denied or Contador not found' });
    }
    const contadorDetails = contadorCheck.rows[0];
    console.log(`[REGISTA] Contador ${contador_id} found. Details: ${JSON.stringify(contadorDetails)}`);

    // Fetch disciplina_id
    console.log('[REGISTA] Fetching disciplina_id...');
    const disciplinaResult = await client.query(`
      SELECT dt.disciplina_id
      FROM disciplina_turma dt
      JOIN professor_disciplina_turma pdt ON dt.id = pdt.disciplina_turma_id
      WHERE pdt.id = $1
    `, [contadorDetails.professor_disciplina_turma_id]);
    const disciplinaId = disciplinaResult.rows[0]?.disciplina_id;

    if (!disciplinaId) {
      await client.query('ROLLBACK');
      console.error('[REGISTA] Error: Could not determine discipline ID for the counter.');
      return res.status(500).json({ error: 'Could not determine discipline ID for the counter.' });
    }
    console.log(`[REGISTA] Disciplina ID: ${disciplinaId}`);

    // Registar tap
    console.log('[REGISTA] Inserting tap record...');
    const tapResult = await client.query(
      'INSERT INTO contador_registo (aluno_id, contador_id, professor_id, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [aluno_id, contador_id, professorId]
    );
    console.log('[REGISTA] Tap record inserted.');

    // =================================================================
    // Aurora Transaction Logic
    // =================================================================
    const transactionAmount = Math.abs(parseFloat(incremento));
    let transactionData = {};
    let valcoinTransaction = null;

    if (parseFloat(incremento) > 0) {
      console.log('[REGISTA] Positive increment: Professor to Student transaction.');
      transactionData = {
        utilizador_origem_id: professorId,
        utilizador_destino_id: aluno_id,
        montante: transactionAmount,
        descricao: `[TAP] ${counterName}`,
        tipo: 'DEBITO', // From professor's perspective
        status: 'APROVADA',
        taxa_iva_ref: 'tipo 1', // As per request
        disciplina_id: disciplinaId,
        icon: contadorDetails.icone || null,
      };
      valcoinTransaction = await _createTransaction(transactionData, client);
      console.log('[REGISTA] Aurora transaction (Professor to Student) created.');
    } else if (parseFloat(incremento) < 0) {
      console.log('[REGISTA] Negative increment: Student to Professor transaction.');
      // Check student balance
      if (alunoSaldo < transactionAmount) {
        await client.query('ROLLBACK');
        console.error(`[REGISTA] Student ${aluno_id} has insufficient balance (${alunoSaldo}) for transaction amount (${transactionAmount}).`);
        return res.status(400).json({ error: 'Saldo insuficiente do aluno para esta transação.' });
      }

      transactionData = {
        utilizador_origem_id: aluno_id,
        utilizador_destino_id: professorId,
        montante: transactionAmount,
        descricao: `[TAP] ${counterName}`,
        tipo: 'DEBITO', // From student's perspective
        status: 'APROVADA',
        taxa_iva_ref: 'tipo 1', // As per request: "iva do professor para o user do iva"
        disciplina_id: disciplinaId,
        icon: contadorDetails.icone || null,
      };
      valcoinTransaction = await _createTransaction(transactionData, client);
      console.log('[REGISTA] Aurora transaction (Student to Professor) created.');
    } else {
      // Incremento is 0, no Valcoin transaction needed
      console.log('[REGISTA] Zero increment: No Aurora transaction needed.');
    }

    await client.query('COMMIT');
    console.log('[REGISTA] Transaction committed successfully.');

    res.status(201).json({
      notaTap: tapResult.rows[0],
      contador: contadorDetails,
      auroraTransaction: valcoinTransaction
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in /contador/regista, transaction rolled back:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    client.release();
    console.log('[REGISTA] Database client released.');
  }
});
/**
 * GET /api/svelte/disciplina/:disciplinaId/contadores
 * Lista alunos com momentos de atitude (contadores) e última atividade
 */
router.get('/dossie/:dossieId/contadores', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const userId = req.user.id; // Assuming userId is available from authentication middleware
    const now = new Date();
    const recentTime = new Date(now - 5 * 60 * 1000); // 5 minutos atrás
    const oldTime = new Date(now - 40 * 24 * 60 * 60 * 1000); // 40 dias atrás

    // Verificar se o dossiê existe e pertence ao professor
    const dossieCheck = await db.query(`
      SELECT d.id, pdt.disciplina_turma_id
      FROM dossie d
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE d.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [dossieId, userId]);

    if (dossieCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or dossie not active' });
    }

    const disciplinaTurmaId = dossieCheck.rows[0].disciplina_turma_id;

    // Buscar alunos da turma
    const alunosResult = await db.query(`
      SELECT u.id, u.nome as name, u.numero_mecanografico as numero
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      WHERE ad.disciplina_turma_id = $1 AND u.tipo_utilizador = 'ALUNO'
      ORDER BY u.nome
    `, [disciplinaTurmaId]);

    // Buscar contadores do dossiê
    const contadoresResult = await db.query(
      'SELECT *, periodo_inativacao_segundos, modelo_calibracao, parametros_calibracao, modelo_esquecimento, parametros_esquecimento FROM contador WHERE dossie_id = $1 ORDER BY tipo, shortname',
      [dossieId]
    );

    // Buscar taps recentes (últimos 5 minutos - para desativar temporariamente)
    const tapsRecentesResult = await db.query(`
      SELECT nt.* 
      FROM contador_registo nt
      JOIN contador c ON c.id = nt.contador_id
      WHERE c.dossie_id = $1 AND nt.created_at >= $2
    `, [dossieId, recentTime]);

    // Buscar todos os taps (para contagem, aplicando esquecimento)
    const tapsTotaisResult = await db.query(`
      SELECT nt.*, c.incremento 
      FROM contador_registo nt
      JOIN contador c ON c.id = nt.contador_id
      WHERE c.dossie_id = $1
    `, [dossieId]);

    console.log(`
      --- Debugging Taps Totais Result ---
      Dossie ID: ${dossieId}
      Total Taps Fetched: ${tapsTotaisResult.rows.length}
      Taps Totais Result Rows: ${JSON.stringify(tapsTotaisResult.rows)}
      ------------------------------------
    `);

    // Buscar a última data de registo para cada contador e aluno
    const lastTapTimesResult = await db.query(`
      SELECT aluno_id, contador_id, MAX(created_at) as last_tap_time
      FROM contador_registo
      WHERE contador_id IN (SELECT id FROM contador WHERE dossie_id = $1)
      GROUP BY aluno_id, contador_id
    `, [dossieId]);

    console.log(`
      --- Debugging Last Tap Times Result ---
      Last Tap Times Result Rows: ${JSON.stringify(lastTapTimesResult.rows)}
      ---------------------------------------
    `);

    const lastTapTimes = {};
    lastTapTimesResult.rows.forEach(row => {
      if (!lastTapTimes[row.aluno_id]) {
        lastTapTimes[row.aluno_id] = {};
      }
      lastTapTimes[row.aluno_id][row.contador_id] = new Date(row.last_tap_time).getTime();
    });

    // Buscar a contagem máxima para cada contador
    const maxContagemResult = await db.query(`
      SELECT c.id as contador_id, SUM(c.incremento) as max_contagem
      FROM contador c
      JOIN contador_registo cr ON c.id = cr.contador_id
      WHERE c.dossie_id = $1
      GROUP BY c.id
    `, [dossieId]);

    const maxContagens = {};
    maxContagemResult.rows.forEach(row => {
      maxContagens[row.contador_id] = parseInt(row.max_contagem);
    });

    // Calcular a soma dos incrementos por contador, aplicando o esquecimento
    const contagem = {};
    const currentTime = Date.now(); // Get current time once
    tapsTotaisResult.rows.forEach(tap => {
      const contador = contadoresResult.rows.find(c => c.id === tap.contador_id);
      if (contador) {
          const tapCreatedAt = new Date(tap.created_at).getTime();
          const forgottenValue = calculateForgottenValue(
              tap.incremento,
              tapCreatedAt,
              contador.modelo_esquecimento,
              contador.parametros_esquecimento,
              currentTime
          );
          const currentContagem = contagem[tap.contador_id] || 0;
          contagem[tap.contador_id] = currentContagem + forgottenValue;

          console.log(`
              --- Debugging Forgetting Calculation ---
              Contador ID: ${contador.id}
              Shortname: ${contador.shortname}
              Tap Incremento: ${tap.incremento}
              Tap Created At: ${tapCreatedAt} (${new Date(tapCreatedAt).toISOString()})
              Forgetting Model: ${contador.modelo_esquecimento}
              Forgetting Params: ${JSON.stringify(contador.parametros_esquecimento)}
              Current Time: ${currentTime} (${new Date(currentTime).toISOString()})
              Time Elapsed Seconds: ${(currentTime - tapCreatedAt) / 1000}
              Forgotten Value: ${forgottenValue}
              Contagem Before Add: ${currentContagem}
              Contagem After Add: ${contagem[tap.contador_id]}
              ----------------------------------------
          `);
      }
    });

    // Processar dados para cada aluno
    const resultado = alunosResult.rows.map(aluno => {
      const tapsAluno = tapsTotaisResult.rows.filter(t => t.aluno_id === aluno.id);
      const tapsRecentesAluno = tapsRecentesResult.rows.filter(t => t.aluno_id === aluno.id);

      // Calcular a soma dos incrementos por contador, aplicando o esquecimento
      const contagem = {};
      const currentTime = Date.now(); // Get current time once
      tapsAluno.forEach(tap => {
        const contador = contadoresResult.rows.find(c => c.id === tap.contador_id);
        if (contador) {
            const tapCreatedAt = new Date(tap.created_at).getTime();
            const forgottenValue = calculateForgottenValue(
                tap.incremento,
                tapCreatedAt,
                contador.modelo_esquecimento,
                contador.parametros_esquecimento,
                currentTime
            );
            const currentContagem = contagem[tap.contador_id] || 0;
            contagem[tap.contador_id] = currentContagem + forgottenValue;
        }
      });

      console.log(`
        --- Debugging Student Contagem ---
        Aluno ID: ${aluno.id}
        Aluno Name: ${aluno.name}
        Taps Aluno Count: ${tapsAluno.length}
        Final Contagem Object: ${JSON.stringify(contagem)}
        ----------------------------------
      `);

      // Obter última data de registo por contador
      const ultimaData = {};
      tapsRecentesAluno.forEach(tap => {
        const timestamp = new Date(tap.created_at).getTime();
        if (!ultimaData[tap.contador_id] || timestamp > ultimaData[tap.contador_id]) {
          ultimaData[tap.contador_id] = timestamp;
        }
      });

              // Criar lista de momentos para este aluno
            const momentos = contadoresResult.rows.map(contador => {
              const lastRegisto = (lastTapTimes[aluno.id] && lastTapTimes[aluno.id][contador.id]) || 0;
              const periodoInativacaoMs = contador.periodo_inativacao_segundos * 1000;
              const now = Date.now();
              const isActiveCalculated = (lastRegisto === 0) || ((now - lastRegisto) > periodoInativacaoMs);
              let tempoInativacaoRestante = 0;
              if (!isActiveCalculated) {
                  tempoInativacaoRestante = Math.ceil((periodoInativacaoMs - (now - lastRegisto)) / 1000);
              };

              return ({
                incremento: contador.incremento,
                tipo: contador.tipo,
                slogan: contador.shortname,
                id: contador.id,
                nome: contador.descritor,
                cor: contador.cor,
                icone: contador.icone,
                lastRegisto: lastRegisto,
                isAtivo: isActiveCalculated,
                tempoInativacaoRestante: tempoInativacaoRestante,
                contagem: contagem[contador.id] || 0,
                maxContagem: maxContagens[contador.id] || 0,
                modelo_calibracao: contador.modelo_calibracao,
                parametros_calibracao: contador.parametros_calibracao,
                modelo_esquecimento: contador.modelo_esquecimento,
                parametros_esquecimento: contador.parametros_esquecimento
              });
            });
      return {
        id: aluno.id,
        text: aluno.name,
        numero: aluno.numero,
        momentos
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== CONTADORES - ESTATÍSTICAS E ANÁLISE ====================

/**
 * GET /api/svelte/contador/:contadorId/estatisticas
 * Retorna estatísticas de utilização do contador
 */
router.get('/contador/:contadorId/estatisticas', async (req, res) => {
  try {
    const { contadorId } = req.params;
    const { dias = 30 } = req.query; // Período em dias (padrão: 30)
    const userId = req.user.id;

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

    // Verificar se o contador existe e pertence ao professor
    const contadorCheck = await db.query(`
      SELECT c.* 
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, userId]);

    if (contadorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Contador not found' });
    }
    
    // Total de registos
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM contador_registo WHERE contador_id = $1 AND created_at >= $2',
      [contadorId, dataInicio]
    );
    
    // Alunos únicos que usaram
    const alunosUnicosResult = await db.query(
      'SELECT COUNT(DISTINCT aluno_id) as total FROM contador_registo WHERE contador_id = $1 AND created_at >= $2',
      [contadorId, dataInicio]
    );
    
    // Top 5 alunos com mais registos
    const topAlunosResult = await db.query(`
      SELECT 
        u.id,
        u.nome as name,
        COUNT(nt.id) as total_taps
      FROM contador_registo nt
      JOIN users u ON u.id = nt.aluno_id
      WHERE nt.contador_id = $1 AND nt.created_at >= $2
      GROUP BY u.id, u.nome
      ORDER BY total_taps DESC
      LIMIT 5
    `, [contadorId, dataInicio]);
    
    // Distribuição por dia
    const distribuicaoDiariaResult = await db.query(`
      SELECT 
        DATE(nt.created_at) as data,
        COUNT(*) as total
      FROM contador_registo nt
      WHERE nt.contador_id = $1 AND nt.created_at >= $2
      GROUP BY DATE(nt.created_at)
      ORDER BY data
    `, [contadorId, dataInicio]);
    
    // Média de taps por aluno
    const mediaResult = await db.query(`
      SELECT 
        ROUND(AVG(taps_por_aluno), 2) as media
      FROM (
        SELECT COUNT(*) as taps_por_aluno
        FROM contador_registo
        WHERE contador_id = $1 AND created_at >= $2
        GROUP BY aluno_id
      ) as subquery
    `, [contadorId, dataInicio]);
    
    res.json({
      contador: contadorCheck.rows[0],
      periodo: {
        dias: parseInt(dias),
        dataInicio,
        dataFim: new Date()
      },
      totalRegistos: parseInt(totalResult.rows[0].total),
      alunosUnicos: parseInt(alunosUnicosResult.rows[0].total),
      mediaRegistosPorAluno: parseFloat(mediaResult.rows[0].media) || 0,
      topAlunos: topAlunosResult.rows,
      distribuicaoDiaria: distribuicaoDiariaResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/contador/:contadorId/historico/:alunoId
 * Retorna histórico de registos de um aluno num contador
 */
router.get('/contador/:contadorId/historico/:alunoId', async (req, res) => {
  try {
    const { contadorId, alunoId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.user.id;

    // Verificar se o contador existe e pertence ao professor
    const contadorCheck = await db.query(`
      SELECT c.id
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, userId]);

    if (contadorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Contador not found' });
    }

    // Verificar se o aluno existe e pertence à turma do contador
    const alunoCheck = await db.query(`
      SELECT u.id
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
      JOIN professor_disciplina_turma pdt ON dt.id = pdt.disciplina_turma_id
      JOIN dossie d ON pdt.id = d.professor_disciplina_turma_id
      JOIN contador c ON d.id = c.dossie_id
      WHERE u.id = $1 AND c.id = $2 AND pdt.professor_id = $3 AND u.tipo_utilizador = 'ALUNO'
    `, [alunoId, contadorId, userId]);

    if (alunoCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Aluno not found in counter\'s discipline' });
    }
    
    const result = await db.query(`
      SELECT 
        nt.*,
        u.nome as aluno_name
      FROM contador_registo nt
      JOIN users u ON u.id = nt.aluno_id
      WHERE nt.contador_id = $1 AND nt.aluno_id = $2
      ORDER BY nt.created_at DESC
      LIMIT $3
    `, [contadorId, alunoId, parseInt(limit)]);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/svelte/contador/tap/:tapId
 * Remove um registo específico (para correções)
 */
router.delete('/contador/tap/:tapId', async (req, res) => {
  try {
    const { tapId } = req.params;
    const userId = req.user.id;

    // Verificar se o tap existe e se o contador associado pertence ao professor
    const tapCheck = await db.query(`
      SELECT nt.id
      FROM contador_registo nt
      JOIN contador c ON c.id = nt.contador_id
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE nt.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [tapId, userId]);

    if (tapCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Tap not found' });
    }
    
    // Deletar tap
    await db.query('DELETE FROM contador_registo WHERE id = $1', [tapId]);
    
    res.status(200).json({ 
      message: 'Tap deleted successfully',
      tap: tapCheck.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/disciplina/:disciplinaId/contadores/resumo
 * Resumo geral dos contadores de uma disciplina
 */
router.get('/dossie/:dossieId/contadores/resumo', async (req, res) => {
  try {
    const { dossieId } = req.params;
    const { dias = 7 } = req.query;
    const userId = req.user.id;

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

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

    // Buscar contadores com contagens
    const result = await db.query(`
      SELECT 
        c.*,
        COUNT(nt.id) as total_taps,
        COUNT(DISTINCT nt.aluno_id) as alunos_unicos,
        MAX(nt.created_at) as ultimo_tap
      FROM contador c
      LEFT JOIN contador_registo nt ON nt.contador_id = c.id AND nt.created_at >= $2
      WHERE c.dossie_id = $1
      GROUP BY c.id
      ORDER BY c.tipo, c.shortname
    `, [dossieId, dataInicio]);

    // Separar por tipo
    const porTipo = {
      atitudinal: result.rows.filter(c => c.tipo.toLowerCase() === 'atitudinal'),
      participacao: result.rows.filter(c => c.tipo.toLowerCase() === 'participacao'),
      experimental: result.rows.filter(c => c.tipo.toLowerCase() === 'experimental'),
      social: result.rows.filter(c => c.tipo.toLowerCase() === 'social'),
      vocacional: result.rows.filter(c => c.tipo.toLowerCase() === 'vocacional')
    };

    // Calcular totais
    const totaisPorTipo = {
      atitudinal: porTipo.atitudinal.reduce((sum, c) => sum + parseInt(c.total_taps), 0),
      participacao: porTipo.participacao.reduce((sum, c) => sum + parseInt(c.total_taps), 0),
      experimental: porTipo.experimental.reduce((sum, c) => sum + parseInt(c.total_taps), 0),
      social: porTipo.social.reduce((sum, c) => sum + parseInt(c.total_taps), 0),
      vocacional: porTipo.vocacional.reduce((sum, c) => sum + parseInt(c.total_taps), 0)
    };

    res.json({
      periodo: {
        dias: parseInt(dias),
        dataInicio,
        dataFim: new Date()
      },
      contadores: result.rows,
      porTipo,
      totaisPorTipo,
      totalGeral: totaisPorTipo.atitudinal + totaisPorTipo.participacao + totaisPorTipo.experimental + totaisPorTipo.social + totaisPorTipo.vocacional
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/aluno/:alunoId/contadores/timeline
 * Timeline de atividades de um aluno em todos os contadores
 */
router.get('/aluno/:alunoId/contadores/timeline', async (req, res) => {
  try {
    const { alunoId } = req.params;
    const { limit = 100 } = req.query;
    const userId = req.user.id;

    // Verificar se o aluno existe e pertence a alguma turma do professor
    const alunoCheck = await db.query(`
      SELECT u.id
      FROM users u
      JOIN aluno_disciplina ad ON u.id = ad.aluno_id
      JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
      JOIN professor_disciplina_turma pdt ON dt.id = pdt.disciplina_turma_id
      WHERE u.id = $1 AND pdt.professor_id = $2 AND u.tipo_utilizador = 'ALUNO'
    `, [alunoId, userId]);

    if (alunoCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Aluno not found for this professor' });
    }
    
    const result = await db.query(`
      SELECT 
        nt.*,
        c.shortname as contador_nome,
        c.tipo as contador_tipo,
        c.incremento,
        c.cor,
        c.icone,
        d.nome as dossie_nome
      FROM contador_registo nt
      JOIN contador c ON c.id = nt.contador_id
      JOIN dossie d ON d.id = c.dossie_id
      WHERE nt.aluno_id = $1
      ORDER BY nt.created_at DESC
      LIMIT $2
    `, [alunoId, parseInt(limit)]);
    
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/svelte/contador/:contadorId/duplicar
 * Duplica um contador (sem duplicar registos)
 */
router.post('/contador/:contadorId/duplicar', async (req, res) => {
  try {
    const { contadorId } = req.params;
    const { novoNome } = req.body;
    const userId = req.user.id;

    if (!novoNome) {
      return res.status(400).json({
        error: 'Validation error',
        details: 'novoNome is required'
      });
    }

    // Buscar contador original e verificar acesso
    const contadorOriginal = await db.query(`
      SELECT c.* 
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, userId]);

    if (contadorOriginal.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Contador not found' });
    }

    const original = contadorOriginal.rows[0];

    // Criar novo contador
    const novoContador = await db.query(
      'INSERT INTO contador (incremento, tipo, shortname, descritor, cor, icone, dossie_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *',
      [original.incremento, original.tipo, novoNome, original.descritor, original.cor, original.icone, original.dossie_id]
    );

    res.status(201).json(novoContador.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/svelte/contador/:contadorId/comparacao
 * Compara uso do contador entre alunos
 */
router.get('/contador/:contadorId/comparacao', async (req, res) => {
  try {
    const { contadorId } = req.params;
    const { dias = 30 } = req.query;
    const userId = req.user.id;

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

    // Verificar se o contador existe e pertence ao professor
    const contadorCheck = await db.query(`
      SELECT c.id
      FROM contador c
      JOIN dossie d ON d.id = c.dossie_id
      JOIN professor_disciplina_turma pdt ON pdt.id = d.professor_disciplina_turma_id
      WHERE c.id = $1 AND pdt.professor_id = $2 AND d.ativo = true
    `, [contadorId, userId]);

    if (contadorCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied or Contador not found' });
    }

    const result = await db.query(`
      SELECT 
        u.id,
        u.nome as name,
        u.numero_mecanografico as numero,
        COUNT(nt.id) as total_taps,
        MIN(nt.created_at) as primeiro_tap,
        MAX(nt.created_at) as ultimo_tap
      FROM users u
      LEFT JOIN contador_registo nt ON nt.aluno_id = u.id 
        AND nt.contador_id = $1 
        AND nt.created_at >= $2
      WHERE u.id IN (
        SELECT DISTINCT aluno_id 
        FROM contador_registo 
        WHERE contador_id = $1
      ) AND u.tipo_utilizador = 'ALUNO'
      GROUP BY u.id, u.nome, u.numero_mecanografico
      ORDER BY total_taps DESC, u.nome
    `, [contadorId, dataInicio]);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dossie/:dossieId/contadores/tipo/:tipo
 * Busca todos os contadores de um tipo específico dentro de um dossiê
 */
router.get('/dossie/:dossieId/contadores/tipo/:tipo', async (req, res, next) => {
  try {
    const { dossieId, tipo } = req.params;
    const userId = req.user.id;

    console.log(`
      --- Debugging /api/dossie/:dossieId/contadores/tipo/:tipo ---
      Received Dossie ID: ${dossieId}
      Received Tipo: ${tipo}
      User ID: ${userId}
      ------------------------------------------------------------
    `);

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

    // Buscar contadores do dossiê pelo tipo
    const contadoresResult = await db.query(
      'SELECT *, periodo_inativacao_segundos, modelo_calibracao, parametros_calibracao, modelo_esquecimento, parametros_esquecimento FROM contador WHERE dossie_id = $1 AND tipo = $2 ORDER BY shortname',
      [dossieId, tipo]
    );

    res.json(contadoresResult.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// Helper function for forgetting calculations
function calculateForgottenValue(tapValue, tapCreatedAt, forgettingModel, forgettingParams, currentTime) {
    const timeElapsedSeconds = (currentTime - tapCreatedAt) / 1000;

    switch (forgettingModel) {
        case 'meia_vida':
            // Expects params like { meiaVidaSegundos: <number> }
            if (forgettingParams && forgettingParams.meiaVidaSegundos > 0) {
                const numHalfLives = timeElapsedSeconds / forgettingParams.meiaVidaSegundos;
                const decayFactor = Math.pow(0.5, numHalfLives);
                return tapValue * decayFactor;
            }
            return tapValue; // Fallback if no valid params
        case 'sigmoidal':
            // Expects params like { L: 1, k: 0.1, x0: 10000 } (L is max decay factor, k is steepness, x0 is midpoint)
            // The sigmoid function here should represent the decay factor (0 to 1)
            if (forgettingParams && forgettingParams.L !== undefined && forgettingParams.k !== undefined && forgettingParams.x0 !== undefined) {
                // Adjusting sigmoid to represent decay from 1 down to near 0
                // A common sigmoid is 1 / (1 + e^(-k*(x-x0)))
                // For decay, we want it to start high and go low. So, 1 - sigmoid or a reversed sigmoid.
                // Let's use 1 - (1 / (1 + Math.exp(-k * (timeElapsedSeconds - x0)))) for decay
                // Or, a simpler decay: L / (1 + Math.exp(k * (timeElapsedSeconds - x0)))
                const decayFactor = forgettingParams.L / (1 + Math.exp(forgettingParams.k * (timeElapsedSeconds - forgettingParams.x0)));
                return tapValue * decayFactor;
            }
            return tapValue; // Fallback
        case 'nenhum':
        default:
            return tapValue;
    }
}

// Helper function for calibration calculations
function calculateCalibratedScore(model, params, rawCount) {
    switch (model) {
        case 'linear':
            // Expects params like { points: [{ raw: 0, calibrated: 0 }, { raw: 10, calibrated: 50 }] }
            if (params && Array.isArray(params.points) && params.points.length >= 2) {
                // Sort points by raw value
                params.points.sort((a, b) => a.raw - b.raw);

                // Find the segment for interpolation
                for (let i = 0; i < params.points.length - 1; i++) {
                    const p1 = params.points[i];
                    const p2 = params.points[i + 1];

                    if (rawCount >= p1.raw && rawCount <= p2.raw) {
                        return p1.calibrated + (rawCount - p1.raw) * (p2.calibrated - p1.calibrated) / (p2.raw - p1.raw);
                    }
                }
                // If rawCount is outside the defined points, extrapolate or cap
                if (rawCount < params.points[0].raw) return params.points[0].calibrated;
                if (rawCount > params.points[params.points.length - 1].raw) return params.points[params.points.length - 1].calibrated;
            }
            return rawCount; // Fallback
        case 'exponencial':
            // Expects params like { a: 1, b: 0.1 } => score = a * Math.exp(b * rawCount)
            if (params.a !== undefined && params.b !== undefined) {
                return params.a * Math.exp(params.b * rawCount);
            }
            return rawCount;
        case 'logistico':
            // Expects params like { L: 100, k: 0.5, x0: 10 } => score = L / (1 + Math.exp(-k * (rawCount - x0)))
            if (params.L !== undefined && params.k !== undefined && params.x0 !== undefined) {
                return params.L / (1 + Math.exp(-params.k * (rawCount - params.x0)));
            }
            return rawCount;
        case 'nenhum':
        default:
            return rawCount;
    }
}

/**
 * POST /api/contador/calibrated-score
 * Calcula a pontuação calibrada para um contador
 */
router.post('/contador/calibrated-score', async (req, res) => {
    try {
        const { modelo_calibracao, parametros_calibracao, contagem_bruta } = req.body;

        if (contagem_bruta === undefined) {
            return res.status(400).json({ error: 'Validation error', details: 'contagem_bruta is required' });
        }

        const calibratedScore = calculateCalibratedScore(modelo_calibracao, parametros_calibracao, contagem_bruta);

        res.json({ calibratedScore });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
