const { withTransaction } = require('../db.js');
const { createAnswer } = require('./form_answers');

/**
 * Cria uma nova submissão de formulário, incluindo todas as suas respostas.
 * @param {string} formId - O ID do formulário que está a ser respondido.
 * @param {Object} responseData - Dados da submissão.
 * @param {string|null} responseData.aluno_id - O ID do aluno, se autenticado.
 * @param {string} responseData.ip_address - O endereço IP do remetente.
 * @param {string} responseData.user_agent - O user agent do remetente.
 * @param {Array<Object>} responseData.answers - Um array de objetos de resposta.
 * @returns {Promise<Object>} A submissão criada (cabeçalho).
 */
async function createFormSubmission(formId, responseData) {
  const { aluno_id, ip_address, user_agent, answers } = responseData;

  return withTransaction(async (client) => {
    // 1. Criar o cabeçalho da resposta na tabela `form_responses`
    const responseHeaderSql = `
      INSERT INTO form_responses (form_id, aluno_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const responseHeaderResult = await client.query(responseHeaderSql, [
      formId,
      aluno_id,
      ip_address,
      user_agent,
    ]);
    const responseId = responseHeaderResult.rows[0].id;

    // 2. Iterar sobre cada resposta e inseri-la usando a função `createAnswer`
    const answerPromises = answers.map(answerData => 
      createAnswer(client, responseId, answerData)
    );
    
    // 3. Executar todas as inserções de resposta
    await Promise.all(answerPromises);

    // 4. Retornar o cabeçalho da submissão criada
    return { id: responseId, form_id: formId, submetido_em: new Date() };
  });
}

module.exports = {
  createFormSubmission,
};
