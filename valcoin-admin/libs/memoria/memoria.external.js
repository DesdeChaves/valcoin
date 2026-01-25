const db = require('../db');

const MAX_EXTERNAL_DISCIPLINES = 5;

// GET /api/memoria/disciplines/available
const getAvailableDisciplinesForExternalUser = async (req, res) => {
    try {
        // Only list disciplines that have at least one active flashcard
        const { rows } = await db.query(`
            SELECT DISTINCT s.id, s.nome, s.codigo
            FROM subjects s
            JOIN flashcards f ON s.id = f.discipline_id
            WHERE s.is_active = TRUE AND f.active = TRUE
            ORDER BY s.nome
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching available disciplines:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar disciplinas disponíveis.' });
    }
};

// POST /api/memoria/disciplines/:discipline_id/subscribe
const subscribeExternalUserToDiscipline = async (req, res) => {
    const { discipline_id } = req.params;
    const student_id = req.user.id;
    const user_type = req.user.tipo_utilizador;

    if (!discipline_id) {
        return res.status(400).json({ success: false, message: 'ID da disciplina é obrigatório.' });
    }

    try {
        // Check if discipline exists
        const disciplineExists = await db.query('SELECT id FROM subjects WHERE id = $1 AND is_active = TRUE', [discipline_id]);
        if (disciplineExists.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Disciplina não encontrada ou inativa.' });
        }

        // Check if user is already subscribed
        const alreadySubscribed = await db.query(
            'SELECT id FROM external_user_disciplines WHERE user_id = $1 AND discipline_id = $2',
            [student_id, discipline_id]
        );
        if (alreadySubscribed.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Já está inscrito nesta disciplina.' });
        }

        if (user_type === 'EXTERNO') {
            // Check current subscription count for external users
            const { rows: currentSubscriptions } = await db.query(
                'SELECT COUNT(*) FROM external_user_disciplines WHERE user_id = $1 AND ativo = TRUE',
                [student_id]
            );

            if (parseInt(currentSubscriptions[0].count, 10) >= MAX_EXTERNAL_DISCIPLINES) {
                return res.status(403).json({ success: false, message: `Utilizadores externos podem subscrever a um máximo de ${MAX_EXTERNAL_DISCIPLINES} disciplinas.` });
            }
        } else if (user_type === 'ALUNO') {
            // Internal students don't use external_user_disciplines, they use aluno_disciplina
            // For now, we only implement this for EXTERNO. If internal students need to subscribe to 'public' disciplines,
            // this logic needs adjustment or a new process.
            return res.status(403).json({ success: false, message: 'Alunos internos são inscritos em disciplinas pela administração da escola.' });
        } else {
             return res.status(403).json({ success: false, message: 'O seu tipo de utilizador não pode subscrever a disciplinas desta forma.' });
        }


        // Subscribe the user
        const newSubscription = await db.query(
            'INSERT INTO external_user_disciplines (user_id, discipline_id) VALUES ($1, $2) RETURNING id',
            [student_id, discipline_id]
        );

        res.status(201).json({ success: true, message: 'Inscrição realizada com sucesso!', subscription_id: newSubscription.rows[0].id });

    } catch (error) {
        console.error('Error subscribing user to discipline:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao subscrever à disciplina.' });
    }
};

// GET /api/memoria/disciplines/my
const getMySubscribedDisciplines = async (req, res) => {
    const student_id = req.user.id;
    const user_type = req.user.tipo_utilizador;

    try {
        let queryResult;
        if (user_type === 'EXTERNO') {
            queryResult = await db.query(`
                SELECT s.id, s.nome, s.codigo
                FROM external_user_disciplines eud
                JOIN subjects s ON eud.discipline_id = s.id
                WHERE eud.user_id = $1 AND eud.ativo = TRUE
                ORDER BY s.nome
            `, [student_id]);
        } else if (user_type === 'ALUNO') {
            queryResult = await db.query(`
                SELECT DISTINCT s.id, s.nome, s.codigo
                FROM aluno_disciplina ad
                JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
                JOIN subjects s ON dt.disciplina_id = s.id
                WHERE ad.aluno_id = $1 AND ad.ativo = TRUE AND dt.ativo = TRUE AND s.is_active = TRUE
                ORDER BY s.nome
            `, [student_id]);
        } else {
            return res.status(403).json({ success: false, message: 'O seu tipo de utilizador não tem disciplinas associadas desta forma.' });
        }
        
        res.json({ success: true, data: queryResult.rows });

    } catch (error) {
        console.error('Error fetching subscribed disciplines:', error);
        res.status(500).json({ success: false, message: 'Erro ao carregar disciplinas inscritas.' });
    }
};

module.exports = {
    getAvailableDisciplinesForExternalUser,
    subscribeExternalUserToDiscipline,
    getMySubscribedDisciplines
};