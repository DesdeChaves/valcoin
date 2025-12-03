const { query } = require('../db');

/**
 * Cria uma única resposta para uma pergunta dentro de uma submissão.
 * Esta função é projetada para ser usada dentro de uma transação.
 * @param {Object} client - O cliente de banco de dados da transação.
 * @param {string} responseId - O ID da submissão (da tabela form_responses).
 * @param {Object} answerData - Os dados da resposta.
 * @returns {Promise<Object>} A resposta criada.
 */
async function createAnswer(client, responseId, answerData) {
  const {
    question_id,
    texto_resposta,
    opcoes_selecionadas,
    valor_numerico,
    data_resposta,
    ficheiros_url,
  } = answerData;

  const sql = `
    INSERT INTO form_answers (
      response_id, question_id, texto_resposta, opcoes_selecionadas,
      valor_numerico, data_resposta, ficheiros_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [
    responseId, question_id, texto_resposta, opcoes_selecionadas,
    valor_numerico, data_resposta, ficheiros_url
  ];
  
  const result = await client.query(sql, values);
  return result.rows[0];
}

module.exports = {
  createAnswer,
};
