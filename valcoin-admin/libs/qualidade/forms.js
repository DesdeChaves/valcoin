// services/qualidadeService.js (ou o nome que preferires)

const db = require('../db.js'); // mantém o teu pool

/**
 * Cria uma nova APLICAÇÃO de questionário (distribuição)
 * @param {object} data
 * @returns {Promise<object>} Aplicação criada
 */
async function createAplicacaoQuestionario(data) {
  const {
    questionario_id,
    aplicador_id,
    titulo_customizado,
    mensagem_introducao,
    mensagem_conclusao,
    tipo_aplicacao,
    publico_alvo,
    turma_id,
    disciplina_turma_id,
    ano_escolar,
    ano_letivo = '2025/26',
    periodo,
    data_abertura,
    data_fecho,
    notificar_destinatarios = true,
    lembrar_nao_respondidos = false,
    ativo = true,
    token_acesso // Add token_acesso here
  } = data;

  const query = `
    INSERT INTO public.aplicacoes_questionario (
      questionario_id, aplicador_id, titulo_customizado, mensagem_introducao, mensagem_conclusao,
      tipo_aplicacao, publico_alvo, turma_id, disciplina_turma_id, ano_escolar, ano_letivo, periodo,
      data_abertura, data_fecho, notificar_destinatarios, lembrar_nao_respondidos, ativo, token_acesso
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *;
  `;

  const values = [
    questionario_id, aplicador_id, titulo_customizado, mensagem_introducao, mensagem_conclusao,
    tipo_aplicacao, publico_alvo, turma_id || null, disciplina_turma_id || null, ano_escolar || null,
    ano_letivo, periodo || null, data_abertura, data_fecho || null,
    notificar_destinatarios, lembrar_nao_respondidos, ativo, token_acesso
  ];

  try {
    const { rows } = await db.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Erro ao criar aplicação de questionário:', error);
    throw error;
  }
}

/**
 * Obtém templates de questionários (visibilidade = escola ou publico)
 */
async function getQuestionariosTemplates() {
  const query = `
    SELECT 
      id, titulo, descricao, categoria, tags, criador_id,
      permite_anonimo, permite_multiplas_respostas,
      data_criacao, data_atualizacao
    FROM public.questionarios
    WHERE visibilidade IN ('escola', 'publico')
      AND ativo = true
    ORDER BY titulo;
  `;

  try {
    const { rows } = await db.query(query);
    return rows;
  } catch (error) {
    console.error('Erro ao obter templates:', error);
    throw error;
  }
}

/**
 * Obtém uma aplicação por ID (com detalhes do questionário)
 */
async function getAplicacaoById(aplicacaoId) {
  const query = `
    SELECT 
      a.*, q.titulo AS questionario_titulo, q.descricao AS questionario_descricao
    FROM public.aplicacoes_questionario a
    JOIN public.questionarios q ON q.id = a.questionario_id
    WHERE a.id = $1;
  `;

  try {
    const { rows } = await db.query(query, [aplicacaoId]);
    return rows[0] || null;
  } catch (error) {
    console.error('Erro ao obter aplicação:', error);
    throw error;
  }
}

/**
 * Lista todas as aplicações (do utilizador ou todas, conforme permissão)
 */
async function getAplicacoes(filters = {}) {
  let query = `
    SELECT 
      a.*, 
      q.titulo AS questionario_titulo,
      COALESCE(a.titulo_customizado, q.titulo) AS titulo_exibicao,
      COUNT(d.id) AS total_destinatarios,
      COUNT(CASE WHEN d.respondido_em IS NOT NULL THEN 1 END) AS total_respondidos
    FROM public.aplicacoes_questionario a
    JOIN public.questionarios q ON q.id = a.questionario_id
    LEFT JOIN public.destinatarios_aplicacao d ON d.aplicacao_id = a.id
    WHERE 1=1
  `;
  const values = [];
  let idx = 1;

  if (filters.aplicador_id) {
    query += ` AND a.aplicador_id = $${idx++}`;
    values.push(filters.aplicador_id);
  }
  // Default to filtering by active applications if not specified
  if (filters.ativo === undefined) {
    query += ` AND a.ativo = TRUE`;
  } else {
    query += ` AND a.ativo = $${idx++}`;
    values.push(filters.ativo);
  }

  query += ` GROUP BY a.id, q.titulo ORDER BY a.data_criacao DESC`;

  try {
    const { rows } = await db.query(query, values);
    return rows;
  } catch (error) {
    console.error('Erro ao listar aplicações:', error);
    throw error;
  }
}

/**
 * Atualiza uma aplicação (ex: prorrogar data_fecho, mudar título, etc.)
 */
async function updateAplicacao(aplicacaoId, updateData) {
  const allowedFields = [
    'titulo_customizado', 'mensagem_introducao', 'mensagem_conclusao',
    'data_fecho', 'notificar_destinatarios', 'lembrar_nao_respondidos', 'ativo'
  ];

  const sets = [];
  const values = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      sets.push(`${field} = $${idx++}`);
      values.push(updateData[field]);
    }
  }

  if (sets.length === 0) return await getAplicacaoById(aplicacaoId);

  values.push(aplicacaoId);
  const query = `
    UPDATE public.aplicacoes_questionario
    SET ${sets.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;

  try {
    const { rows } = await db.query(query, values);
    return rows[0];
  } catch (error) {
    console.error('Erro ao atualizar aplicação:', error);
    throw error;
  }
}

/**
 * Elimina (soft-delete) uma aplicação
 */
async function deleteAplicacao(aplicacaoId) {
  const query = `
    UPDATE public.aplicacoes_questionario
    SET ativo = false
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await db.query(query, [aplicacaoId]);
    return rows[0];
  } catch (error) {
    console.error('Erro ao eliminar aplicação:', error);
    throw error;
  }
}

module.exports = {
  createAplicacaoQuestionario,
  getQuestionariosTemplates,
  getAplicacaoById,
  getAplicacoes,
  updateAplicacao,
  deleteAplicacao,
};
