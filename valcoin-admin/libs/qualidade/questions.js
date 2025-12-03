const db = require('../db.js'); // Adjust path to db.js

/**
 * Cria uma nova pergunta para um formulário.
 * @param {string} formId - ID do formulário.
 * @param {object} questionData - Dados da pergunta (enunciado, tipo, ordem, etc.).
 * @param {Array<object>} optionsData - Array de objetos de opções para a pergunta (opcional).
 * @returns {Promise<object>} A pergunta criada.
 */
async function createQuestion(formId, questionData, optionsData = []) {
    return db.withTransaction(async (client) => {
        const {
            pagina, ordem, tipo_pergunta, enunciado, descricao, obrigatoria,
            escala_min, escala_max, escala_label_min, escala_label_max
        } = questionData;

        const questionQuery = `
            INSERT INTO public.questions (
                form_id, pagina, ordem, tipo_pergunta, enunciado, descricao, obrigatoria,
                escala_min, escala_max, escala_label_min, escala_label_max
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const questionValues = [
            formId, pagina, ordem, tipo_pergunta, enunciado, descricao, obrigatoria,
            escala_min, escala_max, escala_label_min, escala_label_max
        ];

        const { rows: questionRows } = await client.query(questionQuery, questionValues);
        const newQuestion = questionRows[0];

        if (optionsData.length > 0) {
            const optionInsertPromises = optionsData.map((option, index) => {
                const optionQuery = `
                    INSERT INTO public.question_options (question_id, texto, ordem)
                    VALUES ($1, $2, $3) RETURNING *;
                `;
                return client.query(optionQuery, [newQuestion.id, option.texto, option.ordem || (index + 1)]);
            });
            const optionsResults = await Promise.all(optionInsertPromises);
            newQuestion.options = optionsResults.map(res => res.rows[0]);
        } else {
            newQuestion.options = [];
        }

        return newQuestion;
    });
}

/**
 * Obtém uma pergunta pelo ID.
 * @param {string} questionId - ID da pergunta.
 * @param {boolean} includeOptions - Se deve incluir as opções da pergunta.
 * @returns {Promise<object|null>} A pergunta encontrada ou null.
 */
async function getQuestionById(questionId, includeOptions = false) {
    try {
        const questionQuery = 'SELECT * FROM public.questions WHERE id = $1;';
        const { rows: questionRows } = await db.query(questionQuery, [questionId]);

        if (questionRows.length === 0) {
            return null;
        }

        const question = questionRows[0];

        if (includeOptions) {
            const optionsQuery = 'SELECT * FROM public.question_options WHERE question_id = $1 ORDER BY ordem;';
            const { rows: optionsRows } = await db.query(optionsQuery, [questionId]);
            question.options = optionsRows;
        } else {
            question.options = [];
        }

        return question;
    } catch (error) {
        console.error('Error getting question by ID:', error);
        throw error;
    }
}

/**
 * Obtém todas as perguntas de um formulário.
 * @param {string} formId - ID do formulário.
 * @returns {Promise<Array<object>>} Lista de perguntas.
 */
async function getQuestionsByFormId(formId) {
    try {
        const query = `
            SELECT 
                q.*,
                COALESCE(json_agg(qo.* ORDER BY qo.ordem) FILTER (WHERE qo.id IS NOT NULL), '[]') as options
            FROM public.questions q
            LEFT JOIN public.question_options qo ON q.id = qo.question_id
            WHERE q.form_id = $1
            GROUP BY q.id
            ORDER BY q.ordem;
        `;
        const { rows } = await db.query(query, [formId]);
        return rows;
    } catch (error) {
        console.error('Error getting questions by form ID:', error);
        throw error;
    }
}

/**
 * Atualiza uma pergunta existente.
 * @param {string} questionId - ID da pergunta a ser atualizada.
 * @param {object} updateData - Dados para atualização da pergunta.
 * @returns {Promise<object>} A pergunta atualizada.
 */
async function updateQuestion(questionId, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in updateData) {
        if (updateData.hasOwnProperty(key) && key !== 'id' && key !== 'form_id') {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(updateData[key]);
        }
    }

    if (fields.length === 0) {
        const { rows } = await db.query('SELECT * FROM public.questions WHERE id = $1;', [questionId]);
        return rows[0]; // No fields to update, return current question
    }

    values.push(questionId); // Add questionId for the WHERE clause
    const query = `
        UPDATE public.questions
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
    `;

    try {
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        console.error('Error updating question:', error);
        throw error;
    }
}

/**
 * Deleta uma pergunta.
 * @param {string} questionId - ID da pergunta a ser deletada.
 * @returns {Promise<object>} A pergunta deletada.
 */
async function deleteQuestion(questionId) {
    // ON DELETE CASCADE takes care of options
    const query = 'DELETE FROM public.questions WHERE id = $1 RETURNING *;';
    try {
        const { rows } = await db.query(query, [questionId]);
        return rows[0];
    } catch (error) {
        console.error('Error deleting question:', error);
        throw error;
    }
}

/**
 * Adiciona opções a uma pergunta existente.
 * @param {string} questionId - ID da pergunta.
 * @param {Array<object>} optionsData - Array de objetos de opções a serem adicionadas.
 * @returns {Promise<Array<object>>} As opções adicionadas.
 */
async function addOptionsToQuestion(questionId, optionsData) {
    return db.withTransaction(async (client) => {
        const insertedOptions = [];
        for (const option of optionsData) {
            const query = `
                INSERT INTO public.question_options (question_id, texto, ordem)
                VALUES ($1, $2, $3) RETURNING *;
            `;
            const { rows } = await client.query(query, [questionId, option.texto, option.ordem]);
            insertedOptions.push(rows[0]);
        }
        return insertedOptions;
    });
}

/**
 * Atualiza uma opção.
 * @param {string} optionId - ID da opção a ser atualizada.
 * @param {object} updateData - Dados para atualização da opção.
 * @returns {Promise<object>} A opção atualizada.
 */
async function updateOption(optionId, updateData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const key in updateData) {
        if (updateData.hasOwnProperty(key) && key !== 'id' && key !== 'question_id') {
            fields.push(`${key} = $${paramIndex++}`);
            values.push(updateData[key]);
        }
    }

    if (fields.length === 0) {
        const { rows } = await db.query('SELECT * FROM public.question_options WHERE id = $1;', [optionId]);
        return rows[0]; // No fields to update, return current option
    }

    values.push(optionId);
    const query = `
        UPDATE public.question_options
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
    `;

    try {
        const { rows } = await db.query(query, values);
        return rows[0];
    } catch (error) {
        console.error('Error updating option:', error);
        throw error;
    }
}

/**
 * Deleta uma opção.
 * @param {string} optionId - ID da opção a ser deletada.
 * @returns {Promise<object>} A opção deletada.
 */
async function deleteOption(optionId) {
    const query = 'DELETE FROM public.question_options WHERE id = $1 RETURNING *;';
    try {
        const { rows } = await db.query(query, [optionId]);
        return rows[0];
    } catch (error) {
        console.error('Error deleting option:', error);
        throw error;
    }
}

module.exports = {
    createQuestion,
    getQuestionById,
    getQuestionsByFormId,
    updateQuestion,
    deleteQuestion,
    addOptionsToQuestion,
    updateOption,
    deleteOption
};
