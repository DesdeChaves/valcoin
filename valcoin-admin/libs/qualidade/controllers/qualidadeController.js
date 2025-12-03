// server/controllers/qualidadeController.js
const { query, withTransaction } = require('../../db.js'); // Usar o wrapper da BD

/**
 * GET /v1/qualidade/responder/:token
 * Obter questionário por token de acesso
 */
exports.getQuestionarioByToken = async (req, res) => {
  try {
    const { token } = req.params;
    console.log('Token recebido:', token);

    // 1. Buscar a aplicação e o destinatário pelo token
    const aplicacaoQuery = `
      SELECT 
        a.id as aplicacao_id, a.questionario_id, a.titulo_customizado, a.mensagem_introducao,
        a.mensagem_conclusao, a.data_abertura, a.data_fecho, a.ativo, a.tipo_aplicacao,
        a.publico_alvo, q.titulo, q.descricao, q.categoria, q.permite_anonimo,
        q.permite_multiplas_respostas, q.embaralhar_perguntas, q.mostrar_resultados_apos_submissao,
        d.id as destinatario_id, d.user_id, d.encarregado_id, d.empresa_id, d.email_externo,
        d.nome_destinatario, d.tipo_destinatario, d.respondido_em, d.visualizado_em
      FROM aplicacoes_questionario a
      JOIN questionarios q ON a.questionario_id = q.id
      JOIN destinatarios_aplicacao d ON d.aplicacao_id = a.id
      WHERE d.token_acesso = $1 AND a.ativo = true
    `;
    const aplicacaoResult = await query(aplicacaoQuery, [token]);

    if (aplicacaoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Link inválido, expirado ou aplicação inativa.' });
    }

    const aplicacao = aplicacaoResult.rows[0];

    // 2. Verificar período de resposta
    const agora = new Date();
    if (agora < new Date(aplicacao.data_abertura)) {
      return res.status(403).json({ error: 'Este questionário ainda não está disponível.', data_abertura: aplicacao.data_abertura });
    }
    if (aplicacao.data_fecho && agora > new Date(aplicacao.data_fecho)) {
      return res.status(403).json({ error: 'Este questionário já encerrou.', data_fecho: aplicacao.data_fecho });
    }

    // 3. Verificar se já respondeu
    if (aplicacao.respondido_em && !aplicacao.permite_multiplas_respostas) {
      return res.status(403).json({ error: 'Já respondeste a este questionário.', data_resposta: aplicacao.respondido_em });
    }

    // 4. Atualizar visualizado_em
    if (!aplicacao.visualizado_em) {
      await query('UPDATE destinatarios_aplicacao SET visualizado_em = NOW() WHERE id = $1', [aplicacao.destinatario_id]);
    }

    // 5. Buscar perguntas
    const perguntasQuery = `
      SELECT p.id, p.pagina, p.ordem, p.tipo, p.enunciado, p.descricao, p.obrigatoria, p.config, p.pontos
      FROM perguntas p WHERE p.questionario_id = $1 ORDER BY p.pagina, p.ordem
    `;
    const perguntasResult = await query(perguntasQuery, [aplicacao.questionario_id]);
    const perguntas = perguntasResult.rows;

    // 6. Buscar opções
    const perguntasComOpcoes = perguntas.filter(p => ['escolha_unica', 'escolha_multipla', 'lista_suspensa'].includes(p.tipo));
    if (perguntasComOpcoes.length > 0) {
      const perguntasIds = perguntasComOpcoes.map(p => p.id);
      const opcoesQuery = `
        SELECT o.id, o.pergunta_id, o.texto, o.ordem FROM opcoes_resposta o
        WHERE o.pergunta_id = ANY($1) ORDER BY o.ordem
      `;
      const opcoesResult = await query(opcoesQuery, [perguntasIds]);
      const opcoesPorPergunta = opcoesResult.rows.reduce((acc, opcao) => {
        if (!acc[opcao.pergunta_id]) acc[opcao.pergunta_id] = [];
        acc[opcao.pergunta_id].push({ id: opcao.id, texto: opcao.texto, ordem: opcao.ordem });
        return acc;
      }, {});
      perguntas.forEach(p => { p.opcoes = opcoesPorPergunta[p.id] || []; });
    }

    // 7. Embaralhar perguntas
    if (aplicacao.embaralhar_perguntas) {
      perguntas.sort(() => Math.random() - 0.5);
    }

    // 8. Resposta
    res.json({
      aplicacao_id: aplicacao.aplicacao_id,
      questionario_id: aplicacao.questionario_id,
      destinatario_id: aplicacao.destinatario_id,
      user_id: aplicacao.user_id,
      encarregado_id: aplicacao.encarregado_id,
      empresa_id: aplicacao.empresa_id,
      email_respondente: aplicacao.email_externo,
      titulo: aplicacao.titulo_customizado || aplicacao.titulo,
      descricao: aplicacao.descricao,
      categoria: aplicacao.categoria,
      mensagem_introducao: aplicacao.mensagem_introducao,
      mensagem_conclusao: aplicacao.mensagem_conclusao,
      permite_anonimo: aplicacao.permite_anonimo,
      mostrar_resultados_apos_submissao: aplicacao.mostrar_resultados_apos_submissao,
      perguntas: perguntas
    });

  } catch (error) {
    console.error('Erro ao buscar questionário:', error);
    res.status(500).json({ error: 'Erro ao carregar o questionário', details: error.message });
  }
};


/**
 * POST /v1/qualidade/responder/:token
 * Submeter resposta ao questionário
 */
exports.submeterRespostaQuestionario = async (req, res) => {
  try {
    const { token } = req.params;
    const { resposta_questionario, itens_resposta } = req.body;

    if (!resposta_questionario || !itens_resposta) {
      return res.status(400).json({ error: 'Payload inválido', details: '`resposta_questionario` e `itens_resposta` são obrigatórios.' });
    }

    const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || null;

    const respostaId = await withTransaction(async (client) => {
      let aplicacao;
      let destinatario = null; // Pode ser nulo para links públicos

      // TENTATIVA 1: Procurar aplicação diretamente por token (para links públicos)
      const aplicacaoByTokenQuery = `
        SELECT a.id AS aplicacao_id, a.questionario_id, a.tipo_aplicacao, a.ativo, a.data_fecho,
               q.permite_multiplas_respostas
        FROM aplicacoes_questionario a
        JOIN questionarios q ON a.questionario_id = q.id
        WHERE a.token_acesso = $1 AND a.tipo_aplicacao = 'link_aberto'
          AND a.ativo = true
          AND (a.data_fecho IS NULL OR a.data_fecho >= NOW())
      `;
      const aplicacaoByTokenResult = await client.query(aplicacaoByTokenQuery, [token]);

      if (aplicacaoByTokenResult.rows.length > 0) {
        aplicacao = aplicacaoByTokenResult.rows[0];
        // Para links públicos, não há um destinatário específico.
        // O objeto 'destinatario' permanecerá nulo.
      } else {
        // TENTATIVA 2: Procurar destinatário por token (para links de destinatários específicos)
        const destinatarioQuery = `
          SELECT d.id AS destinatario_id, d.aplicacao_id, d.user_id, d.encarregado_id, d.empresa_id, d.email_externo,
                 d.respondido_em, a.tipo_aplicacao, q.permite_multiplas_respostas, a.questionario_id,
                 a.ativo, a.data_fecho
          FROM destinatarios_aplicacao d
          JOIN aplicacoes_questionario a ON d.aplicacao_id = a.id
          JOIN questionarios q ON a.questionario_id = q.id
          WHERE d.token_acesso = $1 AND a.ativo = true
            AND (a.data_fecho IS NULL OR a.data_fecho >= NOW())
        `;
        const destinatarioResult = await client.query(destinatarioQuery, [token]);

        if (destinatarioResult.rows.length === 0) {
          throw { statusCode: 404, message: 'Token inválido ou aplicação inativa.' };
        }
        destinatario = destinatarioResult.rows[0];
        aplicacao = { // Criar um objeto 'aplicacao' a partir dos dados do destinatario
          aplicacao_id: destinatario.aplicacao_id,
          questionario_id: destinatario.questionario_id,
          tipo_aplicacao: destinatario.tipo_aplicacao,
          ativo: destinatario.ativo,
          data_fecho: destinatario.data_fecho,
          permite_multiplas_respostas: destinatario.permite_multiplas_respostas
        };

        // Se for um destinatário específico, verificar se já respondeu e se múltiplas respostas não são permitidas.
        if (destinatario.respondido_em && !aplicacao.permite_multiplas_respostas) {
          throw { statusCode: 403, message: 'Já respondeste a este questionário.' };
        }
      }

      // Agora 'aplicacao' está sempre definido, e 'destinatario' está definido se for um destinatário específico.

      // 2. Inserir a resposta principal
      const insertRespostaQuery = `
        INSERT INTO respostas_questionario (
          aplicacao_id, destinatario_id, user_id, encarregado_id, empresa_id, email_respondente,
          anonimo, tempo_decorrido_segundos, completado, ip_address, user_agent, submetido_em
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        RETURNING id
      `;
      const respostaValues = [
        aplicacao.aplicacao_id,
        destinatario ? destinatario.destinatario_id : null, // destinatario_id pode ser nulo
        destinatario ? destinatario.user_id : null,
        destinatario ? destinatario.encarregado_id : null,
        destinatario ? destinatario.empresa_id : null,
        destinatario ? destinatario.email_externo : null,
        !!resposta_questionario.anonimo,
        resposta_questionario.tempo_decorrido_segundos || 0,
        resposta_questionario.completado !== false,
        ipAddress, req.headers['user-agent']
      ];
      const respostaResult = await client.query(insertRespostaQuery, respostaValues);
      const newRespostaId = respostaResult.rows[0].id;

      // 3. Inserir os itens de resposta (mantém-se igual)
      for (const item of itens_resposta) {
        const insertItemQuery = `
          INSERT INTO itens_resposta (
            resposta_id, pergunta_id, texto, opcoes_selecionadas, valor_numerico,
            valor_data, valor_hora, ficheiros_url, tempo_resposta_segundos
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        const itemValues = [
          newRespostaId, item.pergunta_id, item.texto, item.opcoes_selecionadas,
          item.valor_numerico, item.valor_data, item.valor_hora,
          item.ficheiros_url, item.tempo_resposta_segundos
        ];
        await client.query(insertItemQuery, itemValues);
      }

      // 4. Atualizar o destinatário (APENAS se existir um destinatário específico)
      if (destinatario) {
        await client.query('UPDATE destinatarios_aplicacao SET respondido_em = NOW() WHERE id = $1', [destinatario.destinatario_id]);
      }
      // Sempre atualizar o contador na aplicação
      await client.query('UPDATE aplicacoes_questionario SET total_respostas = COALESCE(total_respostas, 0) + 1 WHERE id = $1', [aplicacao.aplicacao_id]);

      return newRespostaId;
    });

    res.status(201).json({ success: true, message: 'Resposta submetida com sucesso.', resposta_id: respostaId });

  } catch (error) {
    console.error('Erro ao submeter resposta do questionário:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: 'Erro ao submeter resposta.', details: error.message });
  }
};



/**
 * GET /v1/qualidade/aplicacoes/:id/respostas
 * Obter todas as respostas para uma aplicação de questionário
 */
exports.getRespostasByAplicacao = async (req, res) => {
  console.log('🔴🔴🔴 FUNÇÃO getRespostasByAplicacao CHAMADA! 🔴🔴🔴');
  console.log('🔴 Parâmetros:', req.params);
  console.log('🔴 URL completo:', req.originalUrl);
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log('=== BACKEND: Buscando respostas para aplicação:', id);

    // Verificar permissões
    const appCheck = await query('SELECT aplicador_id FROM aplicacoes_questionario WHERE id = $1', [id]);
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aplicação não encontrada.' });
    }
    if (appCheck.rows[0].aplicador_id !== userId && req.user?.tipo_utilizador !== 'ADMIN') {
      return res.status(403).json({ error: 'Não tem permissão para aceder a estas respostas.' });
    }
    
    // Buscar respostas primeiro
    const respostasQuery = `
        SELECT 
            r.id as resposta_id,
            r.submetido_em,
            r.anonimo,
            CASE 
                WHEN r.anonimo THEN 'Anónimo'
                WHEN u.nome IS NOT NULL THEN u.nome
                ELSE r.email_respondente
            END as nome_respondente
        FROM respostas_questionario r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.aplicacao_id = $1
        ORDER BY r.submetido_em DESC;
    `;
    
    const respostasResult = await query(respostasQuery, [id]);
    console.log('=== BACKEND: Respostas encontradas:', respostasResult.rows.length);
    
    if (respostasResult.rows.length === 0) {
      return res.json([]);
    }

    // Para cada resposta, buscar os itens individualmente
    const respostasCompletas = [];
    
    for (const resposta of respostasResult.rows) {
      // Buscar itens da resposta
      const itensQuery = `
        SELECT 
          ir.id,
          ir.pergunta_id,
          ir.texto,
          ir.opcoes_selecionadas,
          ir.valor_numerico,
          ir.valor_data,
          ir.valor_hora,
          ir.ficheiros_url,
          p.enunciado,
          p.tipo,
          p.ordem
        FROM itens_resposta ir
        JOIN perguntas p ON p.id = ir.pergunta_id
        WHERE ir.resposta_id = $1
        ORDER BY p.ordem
      `;
      
      const itensResult = await query(itensQuery, [resposta.resposta_id]);
      console.log(`=== BACKEND: Itens para resposta ${resposta.resposta_id}:`, itensResult.rows.length);
      
      // Para cada item, construir o objeto manualmente
      const itensCompletos = [];
      
      for (const item of itensResult.rows) {
        console.log(`=== BACKEND: Item pergunta_id=${item.pergunta_id}, tipo=${item.tipo}, valor_numerico=${item.valor_numerico}`);
        
        // Buscar textos das opções se necessário
        let opcoes_texto = [];
        if (item.opcoes_selecionadas && item.opcoes_selecionadas.length > 0) {
          const opcoesQuery = `
            SELECT texto 
            FROM opcoes_resposta 
            WHERE id = ANY($1)
            ORDER BY ordem
          `;
          const opcoesResult = await query(opcoesQuery, [item.opcoes_selecionadas]);
          opcoes_texto = opcoesResult.rows.map(o => o.texto);
        }
        
        // Construir objeto do item manualmente
        const itemCompleto = {
          pergunta_id: item.pergunta_id,
          enunciado: item.enunciado,
          tipo: item.tipo,
          resposta_texto: item.texto,
          valor_numerico: item.valor_numerico,
          valor_data: item.valor_data,
          valor_hora: item.valor_hora,
          ficheiros_url: item.ficheiros_url,
          opcoes_selecionadas: item.opcoes_selecionadas,
          opcoes_texto: opcoes_texto
        };
        
        itensCompletos.push(itemCompleto);
      }
      
      respostasCompletas.push({
        resposta_id: resposta.resposta_id,
        submetido_em: resposta.submetido_em,
        anonimo: resposta.anonimo,
        nome_respondente: resposta.nome_respondente,
        itens: itensCompletos
      });
    }
    
    console.log('=== BACKEND: Exemplo de item completo:', JSON.stringify(respostasCompletas[0]?.itens[0], null, 2));
    
    res.json(respostasCompletas);

  } catch (error) {
    console.error(`Erro ao buscar respostas para aplicação ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro interno ao buscar respostas.', details: error.message });
  }
};
/**
 * GET /v1/qualidade/respostas/:id
 * Obter uma resposta individual detalhada
 */
exports.getRespostaById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const respostaQuery = `
      SELECT r.*, a.aplicador_id, q.titulo as questionario_titulo,
             CASE WHEN r.anonimo THEN 'Anónimo' WHEN u.nome IS NOT NULL THEN u.nome ELSE r.email_respondente END as respondente_nome
      FROM respostas_questionario r
      JOIN aplicacoes_questionario a ON r.aplicacao_id = a.id
      JOIN questionarios q ON a.questionario_id = q.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = $1
    `;
    const respostaResult = await query(respostaQuery, [id]);

    if (respostaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resposta não encontrada.' });
    }
    const resposta = respostaResult.rows[0];

    if (resposta.aplicador_id !== userId && req.user?.tipo_utilizador !== 'ADMIN') {
      return res.status(403).json({ error: 'Não tem permissão para aceder a esta resposta.' });
    }

    const itensQuery = `
      SELECT i.*, p.enunciado, p.tipo as tipo_pergunta
      FROM itens_resposta i
      JOIN perguntas p ON i.pergunta_id = p.id
      WHERE i.resposta_id = $1 ORDER BY p.ordem
    `;
    const itensResult = await query(itensQuery, [id]);

    for (let item of itensResult.rows) {
      if (item.opcoes_selecionadas && item.opcoes_selecionadas.length > 0) {
        const opcoesResult = await query('SELECT id, texto FROM opcoes_resposta WHERE id = ANY($1)', [item.opcoes_selecionadas]);
        item.opcoes_texto = opcoesResult.rows;
      }
    }

    res.json({ resposta, itens: itensResult.rows });

  } catch (error) {
    console.error(`Erro ao buscar resposta ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro interno ao buscar a resposta.' });
  }
};


/**
 * GET /v1/qualidade/aplicacoes/:id/estatisticas
 * Obter estatísticas agregadas para uma aplicação
 */
exports.getEstatisticasAplicacao = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const appCheck = await query('SELECT aplicador_id, total_destinatarios FROM aplicacoes_questionario WHERE id = $1', [id]);
    if (appCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Aplicação não encontrada.' });
    }
    const aplicacao = appCheck.rows[0];

    if (aplicacao.aplicador_id !== userId && req.user?.tipo_utilizador !== 'ADMIN') {
      return res.status(403).json({ error: 'Não tem permissão para aceder a estas estatísticas.' });
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_respostas,
        COUNT(*) FILTER (WHERE completado = true) as respostas_completas,
        AVG(tempo_decorrido_segundos) as tempo_medio_segundos,
        AVG(pontuacao_obtida) as pontuacao_media,
        MIN(submetido_em) as primeira_resposta,
        MAX(submetido_em) as ultima_resposta
      FROM respostas_questionario
      WHERE aplicacao_id = $1
    `;
    const statsResult = await query(statsQuery, [id]);
    const stats = statsResult.rows[0];

    const totalRespostas = parseInt(stats.total_respostas, 10) || 0;
    const totalDestinatarios = parseInt(aplicacao.total_destinatarios, 10) || 0;
    const taxaResposta = totalDestinatarios > 0 ? ((totalRespostas / totalDestinatarios) * 100).toFixed(1) : 0;

    res.json({
      resumo: {
        total_destinatarios: totalDestinatarios,
        total_respostas: totalRespostas,
        respostas_completas: parseInt(stats.respostas_completas, 10) || 0,
        taxa_resposta_percentagem: parseFloat(taxaResposta),
        tempo_medio_minutos: stats.tempo_medio_segundos ? (stats.tempo_medio_segundos / 60).toFixed(1) : null,
        pontuacao_media: stats.pontuacao_media ? parseFloat(stats.pontuacao_media).toFixed(2) : null,
        primeira_resposta: stats.primeira_resposta,
        ultima_resposta: stats.ultima_resposta
      }
    });

  } catch (error) {
    console.error(`Erro ao gerar estatísticas para aplicação ${req.params.id}:`, error);
    res.status(500).json({ error: 'Erro interno ao gerar estatísticas.' });
  }
};
