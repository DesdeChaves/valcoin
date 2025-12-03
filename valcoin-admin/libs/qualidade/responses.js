// services/respostasService.js  (ou responses.js – renomeia como quiseres)

const db = require('../db.js');

/**
 * Submete uma resposta a uma aplicação de questionário
 * Pode ser via token (público/externo) ou autenticado
 */
async function submeterResposta(aplicacaoId, destinatarioId, respostasData, req) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Validar aplicação e destinatário
    const validaQuery = `
      SELECT 
        a.*, q.permite_anonimo, q.permite_multiplas_respostas,
        d.respondido_em, d.tipo_destinatario
      FROM public.aplicacoes_questionario a
      JOIN public.questionarios q ON q.id = a.questionario_id
      LEFT JOIN public.destinatarios_aplicacao d ON d.id = $2 AND d.aplicacao_id = a.id
      WHERE a.id = $1 AND a.ativo = true;
    `;
    const { rows } = await client.query(validaQuery, [aplicacaoId, destinatarioId || null]);
    if (rows.length === 0) throw new Error('Aplicação não encontrada ou inativa.');

    const aplicacao = rows[0];

    // Verificações de acesso
    const agora = new Date();
    if (aplicacao.data_abertura && new Date(aplicacao.data_abertura) > agora) {
      throw new Error('Este questionário ainda não abriu.');
    }
    if (aplicacao.data_fecho && new Date(aplicacao.data_fecho) < agora) {
      throw new Error('Este questionário já encerrou.');
    }
    if (destinatarioId && aplicacao.respondido_em) {
      throw new Error('Este destinatário já respondeu.');
    }
    if (!aplicacao.permite_multiplas_respostas && aplicacao.respondido_em) {
      throw new Error('Este questionário não permite múltiplas respostas.');
    }

    // 2. Criar registo principal da resposta
    const respostaQuery = `
      INSERT INTO public.respostas_questionario (
        aplicacao_id, destinatario_id,
        anonimo, ip_address, user_agent,
        completado, submetido_em
      ) VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING *;
    `;

    const anonimo = !destinatarioId || aplicacao.permite_anonimo;
    const respostaValues = [
      aplicacaoId,
      destinatarioId || null,
      anonimo,
      req.ip || req.headers['x-forwarded-for'] || 'unknown',
      req.headers['user-agent'] || 'unknown'
    ];

    const { rows: respRows } = await client.query(respostaQuery, respostaValues);
    const novaResposta = respRows[0];

    // 3. Inserir respostas individuais
    for (const item of respostasData) {
      const { pergunta_id, valor } = item;

      let texto = null;
      let opcoes_selecionadas = null;
      let valor_numerico = null;
      let valor_data = null;
      let valor_hora = null;
      let ficheiros_url = null;

      // Buscar tipo da pergunta para validar
      const tipoRes = await client.query('SELECT tipo, config FROM public.perguntas WHERE id = $1', [pergunta_id]);
      if (tipoRes.rows.length === 0) throw new Error(`Pergunta ${pergunta_id} não encontrada.`);
      const tipo = tipoRes.rows[0].tipo;

      switch (tipo) {
        case 'texto_curto':
        case 'texto_longo':
        case 'email':
          texto = valor;
          break;
        case 'escolha_unica':
        case 'escolha_multipla':
        case 'lista_suspensa':
          opcoes_selecionadas = Array.isArray(valor) ? valor : [valor];
          break;
        case 'escala_linear':
        case 'escala_likert':
        case 'numero':
          valor_numerico = parseFloat(valor);
          break;
        case 'data':
          valor_data = valor;
          break;
        case 'hora':
          valor_hora = valor;
          break;
        case 'upload_ficheiro':
          ficheiros_url = Array.isArray(valor) ? valor : [valor];
          break;
        default:
          texto = typeof valor === 'object' ? JSON.stringify(valor) : valor;
      }

      await client.query(`
        INSERT INTO public.itens_resposta (
          resposta_id, pergunta_id,
          texto, opcoes_selecionadas, valor_numerico,
          valor_data, valor_hora, ficheiros_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        novaResposta.id, pergunta_id,
        texto, opcoes_selecionadas, valor_numerico,
        valor_data, valor_hora, ficheiros_url
      ]);
    }

    // 4. Atualizar destinatário como respondido
    if (destinatarioId) {
      await client.query(`
        UPDATE public.destinatarios_aplicacao
        SET respondido_em = NOW()
        WHERE id = $1
      `, [destinatarioId]);
    }

    // 5. Atualizar contador de respostas na aplicação
    await client.query(`
      UPDATE public.aplicacoes_questionario
      SET total_respostas = total_respostas + 1
      WHERE id = $1
    `, [aplicacaoId]);

    await client.query('COMMIT');
    return novaResposta;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao submeter resposta:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Obter todas as respostas de uma aplicação (para o professor)
 */
async function getRespostasByAplicacao(aplicacaoId) {
  const query = `
    SELECT 
      r.*,
      d.nome_destinatario,
      d.tipo_destinatario,
      d.email_externo,
      u.nome AS nome_user
    FROM public.respostas_questionario r
    LEFT JOIN public.destinatarios_aplicacao d ON d.id = r.destinatario_id
    LEFT JOIN public.users u ON u.id = r.user_id OR u.id = d.user_id
    WHERE r.aplicacao_id = $1
    ORDER BY r.submetido_em DESC;
  `;

  const { rows } = await db.query(query, [aplicacaoId]);
  return rows;
}

/**
 * Obter detalhes completos de uma resposta (com itens_resposta)
 */
async function getRespostaCompleta(respostaId) {
  const respostaQuery = `
    SELECT r.*, a.titulo_customizado, q.titulo AS questionario_titulo
    FROM public.respostas_questionario r
    JOIN public.aplicacoes_questionario a ON a.id = r.aplicacao_id
    JOIN public.questionarios q ON q.id = a.questionario_id
    WHERE r.id = $1;
  `;

  const itensQuery = `
    SELECT 
      ir.*,
      p.enunciado,
      p.tipo,
      p.config,
      COALESCE(json_agg(o.texto) FILTER (WHERE o.id = ANY(ir.opcoes_selecionadas)), '[]') AS opcoes_texto
    FROM public.itens_resposta ir
    JOIN public.perguntas p ON p.id = ir.pergunta_id
    LEFT JOIN public.opcoes_resposta o ON o.id = ANY(ir.opcoes_selecionadas)
    WHERE ir.resposta_id = $1
    GROUP BY ir.id, p.enunciado, p.tipo, p.config
    ORDER BY p.ordem;
  `;

  const [respostaRes, itensRes] = await Promise.all([
    db.query(respostaQuery, [respostaId]),
    db.query(itensQuery, [respostaId])
  ]);

  if (respostaRes.rows.length === 0) return null;

  const resposta = respostaRes.rows[0];
  resposta.itens = itensRes.rows;

  return resposta;
}

module.exports = {
  submeterResposta,
  getRespostasByAplicacao,
  getRespostaCompleta,
};
