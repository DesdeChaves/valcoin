const db = require('../db');
const { redisClient } = require('../redis'); // Assuming redisClient is exported from ../redis

const EVALUATION_CACHE_KEY_PREFIX = 'crisucesso_evaluation:';

// Helper to clear cache for a specific criterion/student or all
const clearEvaluationCache = async (studentId = null, criterionId = null) => {
    try {
        if (studentId && criterionId) {
            await redisClient.del(`${EVALUATION_CACHE_KEY_PREFIX}avg:${studentId}:${criterionId}`);
            await redisClient.del(`${EVALUATION_CACHE_KEY_PREFIX}history:${studentId}:${criterionId}`);
            console.log(`[CACHE CLEARED] Specific evaluation cache for student ${studentId}, criterion ${criterionId}`);
        } else if (studentId) {
            // Potentially clear all related to student
            const keys = await redisClient.keys(`${EVALUATION_CACHE_KEY_PREFIX}*:${studentId}:*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                console.log(`[CACHE CLEARED] All evaluation caches for student ${studentId}`);
            }
        } else if (criterionId) {
            // Potentially clear all related to criterion
             const keys = await redisClient.keys(`${EVALUATION_CACHE_KEY_PREFIX}*:${criterionId}`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                console.log(`[CACHE CLEARED] All evaluation caches for criterion ${criterionId}`);
            }
        } else {
            // Clear all evaluation-related caches (use with caution)
            const keys = await redisClient.keys(`${EVALUATION_CACHE_KEY_PREFIX}*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
                console.log(`[CACHE CLEARED] All crisucesso evaluation caches`);
            }
        }
    } catch (err) {
        console.error('Error clearing evaluation cache:', err);
    }
};

/**
 * Calculates the average score for a student on a specific success criterion.
 * Only considers 'ativo' evaluations.
 */
const calculateAverageScore = async (studentId, criterionId) => {
    const cacheKey = `${EVALUATION_CACHE_KEY_PREFIX}avg:${studentId}:${criterionId}`;
    try {
        const cachedAvg = await redisClient.get(cacheKey);
        if (cachedAvg) {
            console.log(`[CACHE HIT] Average score for student ${studentId}, criterion ${criterionId}`);
            return parseFloat(cachedAvg);
        }

        const { rows } = await db.query(
            `SELECT AVG(pontuacao)::numeric(5,2) AS average_score
             FROM avaliacao_criterio_sucesso
             WHERE aluno_id = $1 AND criterio_sucesso_id = $2`,
            [studentId, criterionId]
        );

        const averageScore = rows[0]?.average_score || 0;
        await redisClient.set(cacheKey, averageScore.toString(), { EX: 3600 }); // Cache for 1 hour
        console.log(`[CACHE SET] Average score for student ${studentId}, criterion ${criterionId}`);
        return parseFloat(averageScore);
    } catch (error) {
        console.error(`Error calculating average score for student ${studentId}, criterion ${criterionId}:`, error);
        throw new Error('Failed to calculate average score.');
    }
};

/**
 * Checks if a new evaluation is allowed based on the criterion's periodicity.
 * Returns true if allowed, false otherwise.
 */
const checkEvaluationPeriodicity = async (criterionId, studentId) => {
    try {
        const { rows: criterionRows } = await db.query(
            `SELECT periodicidade_avaliacao FROM criterio_sucesso WHERE id = $1`,
            [criterionId]
        );
        if (criterionRows.length === 0) {
            throw new Error('Criterion not found.');
        }
        const periodicity = criterionRows[0].periodicidade_avaliacao;

        const { rows: lastEvaluationRows } = await db.query(
            `SELECT created_at FROM avaliacao_criterio_sucesso
             WHERE aluno_id = $1 AND criterio_sucesso_id = $2
             ORDER BY created_at DESC LIMIT 1`,
            [studentId, criterionId]
        );

        if (lastEvaluationRows.length === 0) {
            return true; // No previous evaluations, so a new one is allowed
        }

        const lastEvaluationDate = new Date(lastEvaluationRows[0].created_at);
        const now = new Date();
        let minInterval = 0; // days

        switch (periodicity) {
            case 'trimestral':
                minInterval = 90; // approx 3 months
                break;
            case 'semestral':
                minInterval = 180; // approx 6 months
                break;
            case 'anual':
                minInterval = 365; // approx 1 year
                break;
            default:
                minInterval = 0; // Always allowed if periodicity is undefined or invalid
        }

        const diffTime = Math.abs(now.getTime() - lastEvaluationDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays >= minInterval;

    } catch (error) {
        console.error(`Error checking evaluation periodicity for student ${studentId}, criterion ${criterionId}:`, error);
        throw new Error('Failed to check evaluation periodicity.');
    }
};

/**
 * Checks if an evaluation is within the 8-day amendment window.
 * Returns true if within window, false otherwise.
 */
const checkAmendmentWindow = async (evaluationId) => {
    try {
        const { rows } = await db.query(
            `SELECT created_at FROM avaliacao_criterio_sucesso WHERE id = $1`,
            [evaluationId]
        );

        if (rows.length === 0) {
            throw new Error('Evaluation not found.');
        }

        const createdAt = new Date(rows[0].created_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays <= 8; // 8 days amendment window
    } catch (error) {
        console.error(`Error checking amendment window for evaluation ${evaluationId}:`, error);
        throw new Error('Failed to check amendment window.');
    }
};


/**
 * Retrieves success criteria applicable to a professor-student pair.
 * Considers department association, student grade level, and if the student has met the nivel_aceitavel.
 *
 * @param {string} professorId
 * @param {string} studentId
 * @returns {Array} List of applicable criteria
 */
const getApplicableCrisucessoFeedback = async (professorId, studentId) => {
    try {
        // 1. Get professor's disciplines and their departments
        const { rows: profDisciplines } = await db.query(
            `SELECT DISTINCT s.id AS discipline_id, s.departamento_id
             FROM subjects s
             JOIN disciplina_turma dt ON dt.disciplina_id = s.id
             WHERE dt.professor_id = $1 AND s.ativo = true AND dt.ativo = true`,
            [professorId]
        );

        if (profDisciplines.length === 0) {
            return []; // Professor has no active disciplines
        }

        const professorDepartmentIds = [...new Set(profDisciplines.map(d => d.departamento_id))];
        const professorDisciplineIds = [...new Set(profDisciplines.map(d => d.discipline_id))];

        // 2. Get student's current grade level
        const { rows: studentRows } = await db.query(
            `SELECT ano_escolar FROM users WHERE id = $1 AND tipo_utilizador = 'ALUNO' AND ativo = true`,
            [studentId]
        );
        if (studentRows.length === 0) {
            throw new Error('Student not found or not active.');
        }
        const studentAnoEscolar = studentRows[0].ano_escolar;

        // 3. Find criteria that match professor's departments and student's grade level
        const { rows: applicableCriteria } = await db.query(
            `SELECT
                cs.id AS criterio_id,
                cs.codigo,
                cs.nome,
                cs.descricao,
                cs.ano_escolaridade_inicial,
                cs.ano_escolaridade_limite,
                cs.nivel_aceitavel,
                cs.periodicidade_avaliacao,
                cs.tipo_criterio,
                ARRAY_AGG(DISTINCT d.nome) AS departamentos_nomes,
                ARRAY_AGG(DISTINCT s.id) AS eligible_discipline_ids,
                ARRAY_AGG(DISTINCT s.nome) AS eligible_discipline_names
            FROM
                criterio_sucesso cs
            JOIN
                criterio_sucesso_departamento csd ON csd.criterio_sucesso_id = cs.id AND csd.ativo = true
            JOIN
                departamento d ON d.id = csd.departamento_id AND d.ativo = true
            JOIN
                subjects s ON s.departamento_id = d.id AND s.ativo = true
            WHERE
                cs.ativo = true
                AND cs.ano_escolaridade_inicial <= $1
                AND (cs.ano_escolaridade_limite IS NULL OR cs.ano_escolaridade_limite >= $1)
                AND d.id = ANY($2::uuid[]) -- Criterion associated with one of professor's departments
                AND s.id = ANY($3::uuid[]) -- Professor teaches this subject
            GROUP BY
                cs.id, cs.codigo, cs.nome, cs.descricao, cs.ano_escolaridade_inicial, cs.ano_escolaridade_limite,
                cs.nivel_aceitavel, cs.periodicidade_avaliacao, cs.tipo_criterio
            HAVING
                COUNT(DISTINCT csd.departamento_id) > 0 -- Ensure at least one matching department
            `,
            [studentAnoEscolar, professorDepartmentIds, professorDisciplineIds]
        );
        
        const criteriaWithStatus = [];
        for (const criterion of applicableCriteria) {
            const averageScore = await calculateAverageScore(studentId, criterion.criterio_id);
            const canEvaluate = await checkEvaluationPeriodicity(criterion.criterio_id, studentId);
            const hasMetLevel = averageScore >= criterion.nivel_aceitavel;

            // Always return the criterion with its status flags. The frontend will decide what to display.
            criteriaWithStatus.push({
                ...criterion,
                current_average_score: averageScore,
                can_evaluate: canEvaluate,
                has_met_level: hasMetLevel,
                eligible_discipline_ids: criterion.eligible_discipline_ids.filter(id => professorDisciplineIds.includes(id)),
                eligible_discipline_names: criterion.eligible_discipline_names // Names from all eligible disciplines associated with this criterion's department
            });
        }

        return criteriaWithStatus;

    } catch (error) {
        console.error(`Error getting applicable crisucesso feedback for professor ${professorId}, student ${studentId}:`, error);
        throw new Error('Failed to retrieve applicable criteria.');
    }
};

/**
 * Submits a new evaluation for a student on a success criterion.
 */
const submitCrisucessoFeedbackEvaluation = async (
    criterio_sucesso_id, aluno_id, professor_id, disciplina_id, pontuacao,
    ano_letivo, ano_escolaridade_aluno, periodo, observacoes = null, evidencias = null
) => {
    try {
        // Basic validation
        if (pontuacao < 0 || pontuacao > 10) {
            throw new Error('Score must be between 0 and 10.');
        }

        // Check if professor can evaluate this criterion for this student and discipline
        // (Conditions 1, 2, 3 - checked by getApplicableCrisucessoFeedback already, but a final check is good)
        // Also check periodicity (Condition 4)
        const applicable = await getApplicableCrisucessoFeedback(professor_id, aluno_id);
        const isApplicable = applicable.some(c => 
            c.criterio_id === criterio_sucesso_id && c.eligible_discipline_ids.includes(disciplina_id) && c.can_evaluate
        );

        if (!isApplicable) {
            throw new Error('Professor cannot evaluate this criterion for this student/discipline at this time.');
        }
        
        // Ensure student has not already met the minimum acceptable level if it's not a new periodicity cycle
        const criterionDetails = applicable.find(c => c.criterio_id === criterio_sucesso_id);
        if (criterionDetails && criterionDetails.has_met_level && !criterionDetails.can_evaluate) {
             throw new Error('Student has already met the acceptable level for this criterion, and a new evaluation cycle has not started.');
        }


        const { rows } = await db.query(
            `INSERT INTO avaliacao_criterio_sucesso (
                criterio_sucesso_id, aluno_id, professor_id, disciplina_id, pontuacao,
                ano_letivo, ano_escolaridade_aluno, periodo, observacoes, evidencias
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                criterio_sucesso_id, aluno_id, professor_id, disciplina_id, pontuacao,
                ano_letivo, ano_escolaridade_aluno, periodo, observacoes, evidencias
            ]
        );
        await clearEvaluationCache(aluno_id, criterio_sucesso_id); // Clear cache after new evaluation
        return rows[0];
    } catch (error) {
        console.error(`Error submitting evaluation for student ${aluno_id}, criterion ${criterio_sucesso_id}:`, error);
        throw new Error(error.message || 'Failed to submit evaluation.');
    }
};

/**
 * Updates an existing evaluation within the 8-day amendment window.
 */
const updateCrisucessoFeedbackEvaluation = async (
    evaluationId, professorId, newPontuacao, newObservacoes = null, newEvidencias = null
) => {
    try {
        // Check 8-day amendment window (Condition 5)
        const canAmend = await checkAmendmentWindow(evaluationId);
        if (!canAmend) {
            throw new Error('Evaluation cannot be amended after 8 days.');
        }

        // Verify professor owns this evaluation
        const { rows: evalRows } = await db.query(
            `SELECT professor_id, aluno_id, criterio_sucesso_id FROM avaliacao_criterio_sucesso WHERE id = $1`,
            [evaluationId]
        );
        if (evalRows.length === 0 || evalRows[0].professor_id !== professorId) {
            throw new Error('Evaluation not found or professor not authorized to update.');
        }

        if (newPontuacao < 0 || newPontuacao > 10) {
            throw new Error('Score must be between 0 and 10.');
        }

        const { rows } = await db.query(
            `UPDATE avaliacao_criterio_sucesso
             SET pontuacao = $1, observacoes = $2, evidencias = $3, updated_at = NOW()
             WHERE id = $4 RETURNING *`,
            [newPontuacao, newObservacoes, newEvidencias, evaluationId]
        );
        await clearEvaluationCache(evalRows[0].aluno_id, evalRows[0].criterio_sucesso_id); // Clear cache after update
        return rows[0];
    } catch (error) {
        console.error(`Error updating evaluation ${evaluationId}:`, error);
        throw new Error(error.message || 'Failed to update evaluation.');
    }
};

/**
 * Gets a student's evaluation history for a specific criterion.
 */
const getStudentCrisucessoFeedbackEvaluations = async (studentId, criterionId) => {
    const cacheKey = `${EVALUATION_CACHE_KEY_PREFIX}history:${studentId}:${criterionId}`;
    try {
        const cachedHistory = await redisClient.get(cacheKey);
        if (cachedHistory) {
            console.log(`[CACHE HIT] Evaluation history for student ${studentId}, criterion ${criterionId}`);
            return JSON.parse(cachedHistory);
        }

        const { rows } = await db.query(
            `SELECT
                acs.id,
                acs.pontuacao,
                acs.observacoes,
                acs.evidencias,
                acs.ano_letivo,
                acs.ano_escolaridade_aluno,
                acs.periodo,
                acs.created_at,
                acs.updated_at,
                u_prof.nome AS professor_nome,
                s.nome AS disciplina_nome,
                cs.nome AS criterio_nome,
                (acs.created_at >= NOW() - INTERVAL '8 days') AS can_amend
            FROM
                avaliacao_criterio_sucesso acs
            JOIN
                users u_prof ON u_prof.id = acs.professor_id
            JOIN
                subjects s ON s.id = acs.disciplina_id
            JOIN
                criterio_sucesso cs ON cs.id = acs.criterio_sucesso_id
            WHERE
                acs.aluno_id = $1 AND acs.criterio_sucesso_id = $2
            ORDER BY
                acs.created_at DESC`,
            [studentId, criterionId]
        );
        await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
        console.log(`[CACHE SET] Evaluation history for student ${studentId}, criterion ${criterionId}`);
        return rows;
    } catch (error) {
        console.error(`Error getting evaluation history for student ${studentId}, criterion ${criterionId}:`, error);
        throw new Error('Failed to retrieve evaluation history.');
    }
};


/**
 * Retrieves all unique success criteria that a specific professor is eligible to evaluate.
 * It uses the v_professores_elegiveis_criterio view to determine eligibility.
 *
 * @param {string} professorId The UUID of the professor.
 * @returns {Array} A list of unique applicable criteria, each with id, codigo, and nome.
 */
const getProfessorApplicableCriteria = async (professorId) => {
    try {
        const cacheKey = `${EVALUATION_CACHE_KEY_PREFIX}prof_criteria:${professorId}`;
        const cachedCriteria = await redisClient.get(cacheKey);

        if (cachedCriteria) {
            console.log(`[CACHE HIT] Applicable criteria for professor ${professorId}`);
            return JSON.parse(cachedCriteria);
        }

        // This view already contains the logic for which professors can evaluate which criteria.
        const { rows } = await db.query(
            `SELECT DISTINCT
                criterio_id,
                criterio_codigo,
                criterio_nome
             FROM 
                v_professores_elegiveis_criterio
             WHERE 
                professor_id = $1
             ORDER BY
                criterio_codigo`,
            [professorId]
        );

        await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 3600 }); // Cache for 1 hour
        console.log(`[CACHE SET] Applicable criteria for professor ${professorId}`);
        
        return rows;
    } catch (error) {
        console.error(`Error getting applicable criteria for professor ${professorId}:`, error);
        throw new Error('Failed to retrieve applicable criteria for professor.');
    }
};

const getStudentsForCriterion = async (professorId, criterionId) => {
    try {
        // 1. Get criterion details first
        const { rows: criterionRows } = await db.query(
            `SELECT ano_escolaridade_inicial, ano_escolaridade_limite, nivel_aceitavel 
             FROM criterio_sucesso 
             WHERE id = $1 AND ativo = true`,
            [criterionId]
        );

        if (criterionRows.length === 0) {
            throw new Error('Criterion not found or not active.');
        }
        const criterion = criterionRows[0];

        // 2. Get all unique students taught by the professor
        const { rows: students } = await db.query(
            `SELECT DISTINCT
                u.id,
                u.nome,
                u.ano_escolar,
                c.nome AS turma_nome
             FROM
                users u
             JOIN
                aluno_turma at ON at.aluno_id = u.id
             JOIN
                classes c ON c.id = at.turma_id
             JOIN
                disciplina_turma dt ON dt.turma_id = c.id
             WHERE
                dt.professor_id = $1
                AND u.tipo_utilizador = 'ALUNO'
                AND u.ativo = true
                AND at.ativo = true
                AND dt.ativo = true
                AND c.ativo = true`,
            [professorId]
        );

        // 3. Filter students based on criterion's rules
        const eligibleStudents = [];
        for (const student of students) {
            // Check grade level
            const isGradeApplicable = student.ano_escolar >= criterion.ano_escolaridade_inicial &&
                                      (!criterion.ano_escolaridade_limite || student.ano_escolar <= criterion.ano_escolaridade_limite);

            if (isGradeApplicable) {
                // Check if student's average score is below the acceptable level
                const averageScore = await calculateAverageScore(student.id, criterionId);
                if (averageScore < criterion.nivel_aceitavel) {
                    eligibleStudents.push({
                        id: student.id,
                        nome: student.nome,
                        turma_nome: student.turma_nome,
                        current_average_score: averageScore
                    });
                }
            }
        }
        
        return eligibleStudents;

    } catch (error) {
        console.error(`Error getting students for criterion ${criterionId} by professor ${professorId}:`, error);
        throw new Error('Failed to retrieve eligible students for the criterion.');
    }
};

module.exports = {
    calculateAverageScore,
    checkEvaluationPeriodicity,
    checkAmendmentWindow,
    getApplicableCrisucessoFeedback,
    submitCrisucessoFeedbackEvaluation,
    updateCrisucessoFeedbackEvaluation,
    getStudentCrisucessoFeedbackEvaluations,
    clearEvaluationCache,
    getProfessorApplicableCriteria,
    getStudentsForCriterion,
};