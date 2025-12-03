const { query, withTransaction } = require('../db');

/**
 * Obtém todas as opções para uma pergunta específica, ordenadas pela ordem.
 * @param {string} questionId - O ID da pergunta.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de opções.
 */
async function getOptionsByQuestionId(questionId) {
  const sql = 'SELECT * FROM question_options WHERE question_id = $1 ORDER BY ordem;';
  try {
    const result = await query(sql, [questionId]);
    return result.rows;
  } catch (error) {
    console.error(`Erro ao obter opções para a pergunta ${questionId}:`, error);
    throw error;
  }
}

/**
 * Cria uma nova opção para uma pergunta.
 * @param {string} questionId - O ID da pergunta.
 * @param {Object} optionData - Dados da opção (texto, ordem).
 * @returns {Promise<Object>} A nova opção criada.
 */
async function createOption(questionId, optionData) {
  const { texto, ordem } = optionData;
  const sql = 'INSERT INTO question_options (question_id, texto, ordem) VALUES ($1, $2, $3) RETURNING *;';
  try {
    const result = await query(sql, [questionId, texto, ordem]);
    return result.rows[0];
  } catch (error) {
    console.error('Erro ao criar opção de pergunta:', error);
    throw error;
  }
}

/**
 * Atualiza uma opção de pergunta.
 * @param {string} optionId - O ID da opção a ser atualizada.
 * @param {Object} updates - Campos a serem atualizados (texto, ordem).
 * @returns {Promise<Object|null>} A opção atualizada ou null se não encontrada.
 */
async function updateOption(optionId, updates) {
  const { texto, ordem } = updates;
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  if (texto !== undefined) {
    setClauses.push(`texto = $${paramIndex++}`);
    values.push(texto);
  }
  if (ordem !== undefined) {
    setClauses.push(`ordem = $${paramIndex++}`);
    values.push(ordem);
  }

  if (setClauses.length === 0) {
    const result = await query('SELECT * FROM question_options WHERE id = $1', [optionId]);
    return result.rows[0] || null;
  }

  values.push(optionId);
  const sql = `UPDATE question_options SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;

  try {
    const result = await query(sql, values);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`Erro ao atualizar a opção ${optionId}:`, error);
    throw error;
  }
}

/**
 * Exclui uma opção de pergunta.
 * @param {string} optionId - O ID da opção a ser excluída.
 * @returns {Promise<boolean>} True se excluído, false caso contrário.
 */
async function deleteOption(optionId) {
  const sql = 'DELETE FROM question_options WHERE id = $1 RETURNING id;';
  try {
    const result = await query(sql, [optionId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error(`Erro ao excluir a opção ${optionId}:`, error);
    throw error;
  }
}

/**
 * Substitui todas as opções de uma pergunta.
 * Isso é útil para reordenar, adicionar e remover tudo de uma vez.
 * @param {string} questionId - O ID da pergunta.
 * @param {Array<Object>} options - O novo array de opções (cada objeto deve ter 'texto' e 'ordem').
 * @returns {Promise<Array>} O novo array de opções inseridas.
 */
async function replaceOptionsForQuestion(questionId, options) {
  return withTransaction(async (client) => {
    // 1. Deleta todas as opções antigas para esta pergunta
    await client.query('DELETE FROM question_options WHERE question_id = $1;', [questionId]);

    if (!options || options.length === 0) {
        return []; // Retorna um array vazio se não houver novas opções
    }

    // 2. Insere todas as novas opções
    const insertPromises = options.map(opt => {
        const insertSql = 'INSERT INTO question_options (question_id, texto, ordem) VALUES ($1, $2, $3) RETURNING *;';
        return client.query(insertSql, [questionId, opt.texto, opt.ordem]);
    });
    
    const results = await Promise.all(insertPromises);
    
    return results.map(res => res.rows[0]);
  });
}


module.exports = {
  getOptionsByQuestionId,
  createOption,
  updateOption,
  deleteOption,
  replaceOptionsForQuestion,
};
