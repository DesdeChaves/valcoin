const Joi = require('joi');
const db = require('../db');

// ============================================================================
// JOI SCHEMAS
// ============================================================================

const medidaEducativaSchema = Joi.object({
    aluno_id: Joi.string().uuid().required(),
    tipo_medida: Joi.string().valid('universal', 'seletiva', 'adicional').required(),
    disciplina_id: Joi.string().uuid().allow(null),
    descricao: Joi.string().min(3).required(),
    data_inicio: Joi.date().iso().required(),
    data_fim: Joi.date().iso().allow(null),
    documento_referencia: Joi.string().max(255).allow(null, ''),
});

const updateMedidaEducativaSchema = Joi.object({
    tipo_medida: Joi.string().valid('universal', 'seletiva', 'adicional'),
    disciplina_id: Joi.string().uuid().allow(null),
    descricao: Joi.string().min(3),
    data_inicio: Joi.date().iso(),
    data_fim: Joi.date().iso().allow(null),
    documento_referencia: Joi.string().max(255).allow(null, ''),
}).min(1).unknown(true); // At least one field must be updated, and allow other keys

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get all educational measures for a specific student
 * @param {string} alunoId - The UUID of the student.
 * @returns {Promise<Array>} - A promise that resolves to an array of measures.
 */
const getMedidasEducativasByAluno = async (alunoId) => {
    const { rows } = await db.query(
        `SELECT ame.*, s.nome as disciplina_nome 
         FROM aluno_medida_educativa ame
         LEFT JOIN subjects s ON s.id = ame.disciplina_id
         WHERE ame.aluno_id = $1 
         ORDER BY ame.data_inicio DESC`,
        [alunoId]
    );
    return rows;
};

/**
 * Get a single educational measure by its ID.
 * @param {string} id - The UUID of the measure.
 * @returns {Promise<Object|null>} - A promise that resolves to the measure object or null if not found.
 */
const getMedidaEducativaById = async (id) => {
    const { rows } = await db.query(
        `SELECT ame.*, s.nome as disciplina_nome 
         FROM aluno_medida_educativa ame
         LEFT JOIN subjects s ON s.id = ame.disciplina_id
         WHERE ame.id = $1`,
        [id]
    );
    return rows[0] || null;
};

/**
 * Create a new educational measure.
 * @param {Object} data - The measure data, validated against medidaEducativaSchema.
 * @param {string} registadoPorId - The UUID of the user creating the measure.
 * @returns {Promise<Object>} - A promise that resolves to the newly created measure.
 */
const createMedidaEducativa = async (data, registadoPorId) => {
    const { error, value } = medidaEducativaSchema.validate(data);
    if (error) {
        throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const {
        aluno_id,
        tipo_medida,
        disciplina_id,
        descricao,
        data_inicio,
        data_fim,
        documento_referencia,
    } = value;

    // Case 1: A specific discipline is provided
    if (disciplina_id) {
        // Check for duplicates
        const existing = await db.query(
            'SELECT id FROM aluno_medida_educativa WHERE aluno_id = $1 AND disciplina_id = $2 AND tipo_medida = $3',
            [aluno_id, disciplina_id, tipo_medida]
        );
        if (existing.rows.length > 0) {
            throw new Error(`A measure of type '${tipo_medida}' already exists for this student in this subject.`);
        }

        const { rows } = await db.query(
            `INSERT INTO aluno_medida_educativa (aluno_id, tipo_medida, disciplina_id, descricao, data_inicio, data_fim, registado_por_id, documento_referencia)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [aluno_id, tipo_medida, disciplina_id, descricao, data_inicio, data_fim, registadoPorId, documento_referencia]
        );
        return rows[0];
    }

    // Case 2: "All disciplines" (disciplina_id is null)
    return db.withTransaction(async (client) => {
        // a. Get all subjects the student is enrolled in
        const studentSubjectsRes = await client.query(
            `SELECT DISTINCT dt.disciplina_id
             FROM aluno_disciplina ad
             JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
             WHERE ad.aluno_id = $1 AND dt.disciplina_id IS NOT NULL`,
            [aluno_id]
        );
        const studentSubjectIds = studentSubjectsRes.rows.map(r => r.disciplina_id);

        // b. Get all existing measures for that student for the given type
        const existingMeasuresRes = await client.query(
            'SELECT disciplina_id FROM aluno_medida_educativa WHERE aluno_id = $1 AND tipo_medida = $2 AND disciplina_id IS NOT NULL',
            [aluno_id, tipo_medida]
        );
        const existingMeasureSubjectIds = new Set(existingMeasuresRes.rows.map(r => r.disciplina_id));

        // c. Determine which subjects need a new measure
        const subjectsToInsert = studentSubjectIds.filter(id => !existingMeasureSubjectIds.has(id));

        if (subjectsToInsert.length === 0) {
            return { message: 'No new measures to create. Measures of this type may already exist for all enrolled subjects.' };
        }

        // d. Insert the new measures
        const insertPromises = subjectsToInsert.map(subjectId => {
            return client.query(
                `INSERT INTO aluno_medida_educativa (aluno_id, tipo_medida, disciplina_id, descricao, data_inicio, data_fim, registado_por_id, documento_referencia)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [aluno_id, tipo_medida, subjectId, descricao, data_inicio, data_fim, registadoPorId, documento_referencia]
            );
        });

        await Promise.all(insertPromises);

        return { message: `Successfully created ${subjectsToInsert.length} new educational measures.` };
    });
};

/**
 * Update an existing educational measure.
 * @param {string} id - The UUID of the measure to update.
 * @param {Object} data - The fields to update, validated against updateMedidaEducativaSchema.
 * @returns {Promise<Object|null>} - A promise that resolves to the updated measure or null if not found.
 */
const updateMedidaEducativa = async (id, data) => {
    const { error, value } = updateMedidaEducativaSchema.validate(data);
    if (error) {
        throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const existingMeasure = await getMedidaEducativaById(id);
    if (!existingMeasure) {
        return null;
    }

    const updatedData = { ...existingMeasure, ...value };

    const { rows } = await db.query(
        `UPDATE aluno_medida_educativa SET
            tipo_medida = $1,
            disciplina_id = $2,
            descricao = $3,
            data_inicio = $4,
            data_fim = $5,
            documento_referencia = $6,
            updated_at = NOW()
        WHERE id = $7
        RETURNING *`,
        [
            updatedData.tipo_medida,
            updatedData.disciplina_id,
            updatedData.descricao,
            updatedData.data_inicio,
            updatedData.data_fim,
            updatedData.documento_referencia,
            id
        ]
    );
    return rows[0];
};

/**
 * Delete an educational measure.
 * @param {string} id - The UUID of the measure to delete.
 * @returns {Promise<boolean>} - A promise that resolves to true if the deletion was successful.
 */
const deleteMedidaEducativa = async (id) => {
    const { rowCount } = await db.query(
        'DELETE FROM aluno_medida_educativa WHERE id = $1',
        [id]
    );
    return rowCount > 0;
};


module.exports = {
    getMedidasEducativasByAluno,
    getMedidaEducativaById,
    createMedidaEducativa,
    updateMedidaEducativa,
    deleteMedidaEducativa,
};
