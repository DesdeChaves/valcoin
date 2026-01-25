const db = require('../../db');
const { sendEmail } = require('../../email');
const { getStudentsByClassId } = require('../../classes');

const createQuizApplication = async (req, res) => {
    const { quizId, turmaIds, startTime, endTime } = req.body;
    const aplicador_id = req.user.id;

    try {
        await db.query('BEGIN');

        const { rows: quizRows } = await db.query('SELECT discipline_id, title FROM quizzes WHERE id = $1', [quizId]);
        if (quizRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }
        const disciplineId = quizRows[0].discipline_id;
        const quizTitle = quizRows[0].title;

        for (const turma_id of turmaIds) {
            const { rows } = await db.query(
                `INSERT INTO public.quiz_applications (quiz_id, turma_id, start_time, end_time)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [quizId, turma_id, startTime, endTime]
            );
            const application_id = rows[0].id;

            const students = await getStudentsByClassId(turma_id, disciplineId);
            for (const student of students) {
                const subject = `Novo Quiz Disponível: ${quizTitle}`;
                // TODO: Replace LINK_TO_QUIZ with actual link
                const html = `<p>Olá ${student.nome},</p><p>Um novo quiz "${quizTitle}" foi disponibilizado para responderes. Clica <a href="http://aevalpacos.duckdns.org">aqui</a> para começar. Autentica-te na aplicação laranja "Gestão da Qualidade"</p>`;
                await sendEmail(student.email, subject, html);
            }
        }

        await db.query('COMMIT');
        res.status(201).json({ success: true, message: 'Quiz applied successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating quiz application:', error);
        res.status(500).json({ success: false, message: 'Internal server error while applying quiz.' });
    }
};

const getStudentQuizApplications = async (req, res) => {
    try {
        const studentId = req.user.id;

        const { rows } = await db.query(
            `SELECT
                qa.id AS application_id,
                q.id AS quiz_id,
                q.title AS quiz_title,
                s.nome AS discipline_name,
                qa.start_time,
                qa.end_time,
                sqa.id AS attempt_id,
                sqa.score,
                sqa.passed,
                sqa.submit_time IS NOT NULL AS has_attempted
            FROM
                public.quiz_applications qa
            JOIN
                public.quizzes q ON qa.quiz_id = q.id
            JOIN
                public.subjects s ON q.discipline_id = s.id
            LEFT JOIN
                public.student_quiz_attempts sqa ON qa.id = sqa.application_id AND sqa.student_id = $1
            WHERE
                qa.turma_id IN (SELECT turma_id FROM public.aluno_turma WHERE aluno_id = $1)
                AND (qa.end_time IS NULL OR qa.end_time > NOW())
            ORDER BY
                qa.start_time DESC;`,
            [studentId]
        );

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching student quiz applications:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching student quizzes.' });
    }
};

const getQuizQuestions = async (req, res) => {
    try {
        const { quizApplicationId } = req.params;
        const studentId = req.user.id;

        // 1. Verify quiz application exists and is for this student
        const { rows: appRows } = await db.query(
            `SELECT
                qa.id,
                qa.quiz_id,
                qa.start_time,
                qa.end_time,
                q.title
            FROM public.quiz_applications qa
            JOIN public.quizzes q ON qa.quiz_id = q.id
            WHERE qa.id = $1
            AND qa.turma_id IN (SELECT turma_id FROM public.aluno_turma WHERE aluno_id = $2)`,
            [quizApplicationId, studentId]
        );

        if (appRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Quiz application not found or not assigned to student.' });
        }

        const quizApplication = appRows[0];

        // Check if quiz is active (start_time passed, end_time not passed)
        const now = new Date();
        if (new Date(quizApplication.start_time) > now || (quizApplication.end_time && new Date(quizApplication.end_time) < now)) {
            return res.status(403).json({ success: false, message: 'Quiz is not currently active.' });
        }

        // 2. Check if student has already submitted an attempt
        const { rows: attemptRows } = await db.query(
            `SELECT id FROM public.student_quiz_attempts
            WHERE application_id = $1 AND student_id = $2 AND submit_time IS NOT NULL`,
            [quizApplicationId, studentId]
        );

        if (attemptRows.length > 0) {
            return res.status(403).json({ success: false, message: 'Student has already submitted this quiz.' });
        }

        // 3. Fetch quiz questions and options
        const { rows: questionRows } = await db.query(
            `SELECT
                qq.id,
                qq.question_text,
                qq.options
            FROM public.quiz_questions qq
            WHERE qq.quiz_id = $1
            ORDER BY qq.id`, // Order might need to be random in the future
            [quizApplication.quiz_id]
        );
        
        // Return quiz details and questions
        res.status(200).json({
            success: true,
            data: {
                quiz: {
                    id: quizApplication.quiz_id,
                    title: quizApplication.title,
                    application_id: quizApplication.id,
                    start_time: quizApplication.start_time,
                    end_time: quizApplication.end_time,
                },
                questions: questionRows.map(q => ({
                    id: q.id,
                    question_text: q.question_text,
                    options: q.options, // Frontend will render options
                })),
            },
        });

    } catch (error) {
        console.error('Error fetching quiz questions:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching quiz questions.' });
    }
};

const submitQuizAttempt = async (req, res) => {
    const { quizApplicationId } = req.params;
    const { answers } = req.body; // [{ question_id, chosen_option_id }]
    const studentId = req.user.id;

    if (!answers || answers.length === 0) {
        return res.status(400).json({ success: false, message: 'No answers provided.' });
    }

    let client;
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');

        // 1. Verify quiz application exists and is for this student, and is active
        const { rows: appRows } = await client.query(
            `SELECT
                qa.id,
                qa.quiz_id,
                qa.start_time,
                qa.end_time
            FROM public.quiz_applications qa
            WHERE qa.id = $1
            AND qa.turma_id IN (SELECT turma_id FROM public.aluno_turma WHERE aluno_id = $2)`,
            [quizApplicationId, studentId]
        );

        if (appRows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Quiz application not found or not assigned to student.' });
        }
        const quizApplication = appRows[0];

        // Check if quiz is active (start_time passed, end_time not passed)
        const now = new Date();
        if (new Date(quizApplication.start_time) > now || (quizApplication.end_time && new Date(quizApplication.end_time) < now)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Quiz is not currently active or has expired.' });
        }

        // 2. Check if student has already submitted an attempt
        const { rows: existingAttemptRows } = await client.query(
            `SELECT id FROM public.student_quiz_attempts
            WHERE application_id = $1 AND student_id = $2 AND submit_time IS NOT NULL`,
            [quizApplicationId, studentId]
        );

        if (existingAttemptRows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Student has already submitted this quiz.' });
        }

        // 3. Create student_quiz_attempts entry
        const { rows: attemptInsertRows } = await client.query(
            `INSERT INTO public.student_quiz_attempts (application_id, student_id, start_time, submit_time)
            VALUES ($1, $2, NOW(), NOW()) RETURNING id`,
            [quizApplicationId, studentId]
        );
        const attemptId = attemptInsertRows[0].id;

        // 4. Get correct answers and question types for all questions in the quiz
        const { rows: questionDetailsRows } = await client.query(
            `SELECT qq.id, qq.correct_answer_id, qq.question_type, qq.options
            FROM public.quiz_questions qq
            WHERE qq.quiz_id = $1`,
            [quizApplication.quiz_id]
        );
        const questionDetailsMap = new Map(questionDetailsRows.map(row => [row.id, row]));

        let correctCount = 0;
        let totalQuestions = answers.length; // Number of questions attempted

        // 5. Insert student_quiz_answers for each provided answer and calculate correctness
        for (const studentAnswer of answers) {
            const questionId = studentAnswer.question_id;
            const chosenOptionId = studentAnswer.chosen_option_id; // Can be string or JSONB object
            const questionDetail = questionDetailsMap.get(questionId);

            if (!questionDetail) {
                console.warn(`Question ${questionId} not found in quiz, skipping.`);
                totalQuestions--; // Reduce total questions if a question is unexpectedly missing
                continue;
            }

            let isCorrect = false;

            if (questionDetail.question_type === 'image_occlusion_fill_in_the_blank') {
                // For image occlusion, chosen_option_id is an object {occlusion_id: typed_text}
                // questionDetail.options is [{id: 'a', text: 'label1'}, {id: 'b', text: 'label2'}]
                const correctOcclusions = questionDetail.options; // These are the labels
                const studentOcclusionAnswers = chosenOptionId; // e.g., {'occ1': 'answer1'}

                let allOcclusionsCorrect = true;
                if (correctOcclusions && correctOcclusions.length > 0) {
                    for (const correctOcc of correctOcclusions) {
                        const studentTypedAnswer = studentOcclusionAnswers ? studentOcclusionAnswers[correctOcc.id] : '';
                        // Case-insensitive and trimmed comparison
                        if (studentTypedAnswer.trim().toLowerCase() !== correctOcc.text.trim().toLowerCase()) {
                            allOcclusionsCorrect = false;
                            break;
                        }
                    }
                } else { // If there are no occlusions defined but it's an image occlusion type, consider it correct if no answers were expected/provided
                    allOcclusionsCorrect = true;
                }
                isCorrect = allOcclusionsCorrect;

            } else {
                // For multiple_choice, true_false, etc.
                isCorrect = (chosenOptionId === questionDetail.correct_answer_id);
            }
            
            if (isCorrect) {
                correctCount++;
            }

            // Store chosen_option_id as JSONB
            await client.query(
                `INSERT INTO public.student_quiz_answers (attempt_id, question_id, chosen_option_id, is_correct)
                VALUES ($1, $2, $3::jsonb, $4)`,
                [attemptId, questionId, JSON.stringify(chosenOptionId), isCorrect] // Store as JSONB
            );
        }

        // 6. Calculate score and update student_quiz_attempts
        const score = (totalQuestions > 0) ? (correctCount / totalQuestions) * 100 : 0;
        const passingScore = 50; // Define a passing score threshold
        const passed = score >= passingScore;

        await client.query(
            `UPDATE public.student_quiz_attempts
            SET score = $1, passed = $2
            WHERE id = $3`,
            [score, passed, attemptId]
        );

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Quiz submitted successfully', score, passed });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error('Error submitting quiz attempt:', error);
        res.status(500).json({ success: false, message: 'Internal server error while submitting quiz.', error: error.message });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getAppliedQuizzesByProfessor = async (req, res) => {
    const professorId = req.user.id;
    try {
        const { rows } = await db.query(
            `SELECT
                qa.id AS application_id,
                q.id AS quiz_id,
                q.title AS quiz_title,
                s.id AS discipline_id,
                s.nome AS discipline_name,
                c.id AS turma_id,
                c.nome AS turma_nome,
                qa.start_time,
                qa.end_time
            FROM
                public.quiz_applications qa
            JOIN
                public.quizzes q ON qa.quiz_id = q.id
            JOIN
                public.classes c ON qa.turma_id = c.id
            JOIN
                public.subjects s ON q.discipline_id = s.id
            WHERE
                q.professor_id = $1
            ORDER BY
                qa.start_time DESC;`,
            [professorId]
        );
        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching applied quizzes by professor:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const getQuizApplicationResults = async (req, res) => {
    const { applicationId } = req.params;
    try {
        // First, get application details
        const { rows: appRows } = await db.query(
            `SELECT 
                qa.turma_id,
                q.title AS quiz_title,
                q.discipline_id,
                d.id AS dossie_id
             FROM public.quiz_applications qa
             JOIN public.quizzes q ON qa.quiz_id = q.id
             LEFT JOIN public.disciplina_turma dt ON q.discipline_id = dt.disciplina_id AND qa.turma_id = dt.turma_id
             LEFT JOIN public.professor_disciplina_turma pdt ON dt.id = pdt.disciplina_turma_id AND q.professor_id = pdt.professor_id
             LEFT JOIN public.dossie d ON pdt.id = d.professor_disciplina_turma_id
             WHERE qa.id = $1`,
            [applicationId]
        );

        if (appRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Quiz application not found.' });
        }

        // Then, get all students for this class and discipline, and left join with their attempts
        const { rows: resultsRows } = await db.query(
            `SELECT
                u.id AS student_id,
                u.nome AS student_name,
                COALESCE(sa.score, 0) AS score
            FROM
                public.users u
            JOIN
                public.aluno_disciplina ad ON u.id = ad.aluno_id
            JOIN
                public.disciplina_turma dt ON ad.disciplina_turma_id = dt.id
            LEFT JOIN
                public.student_quiz_attempts sa ON sa.student_id = u.id AND sa.application_id = $1 AND sa.submit_time IS NOT NULL
            WHERE
                u.tipo_utilizador = 'ALUNO'
                AND dt.turma_id = $2
                AND dt.disciplina_id = $3
            ORDER BY
                u.nome;`,
            [applicationId, appRows[0].turma_id, appRows[0].discipline_id]
        );

        res.status(200).json({ 
            success: true, 
            data: {
                application: appRows[0],
                results: resultsRows
            } 
        });
    } catch (error) {
        console.error('Error fetching quiz application results:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Adicionar ao quiz_application.controller.js

const getQuizApplicationsByQuizId = async (req, res) => {
    const { quizId } = req.params;
    const professorId = req.user.id;

    try {
        // Verify that the quiz belongs to this professor
        const { rows: quizRows } = await db.query(
            'SELECT id FROM quizzes WHERE id = $1 AND professor_id = $2',
            [quizId, professorId]
        );

        if (quizRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Quiz not found or you do not have permission to view its applications.' 
            });
        }

        // Get all applications for this quiz
        const { rows } = await db.query(
            `SELECT
                qa.id AS application_id,
                qa.turma_id,
                qa.start_time,
                qa.end_time,
                qa.application_date,
                c.nome AS turma_nome,
                s.nome AS discipline_name,
                COUNT(DISTINCT sqa.student_id) AS students_attempted
            FROM
                public.quiz_applications qa
            JOIN
                public.classes c ON qa.turma_id = c.id
            JOIN
                public.quizzes q ON qa.quiz_id = q.id
            JOIN
                public.subjects s ON q.discipline_id = s.id
            LEFT JOIN
                public.student_quiz_attempts sqa ON qa.id = sqa.application_id AND sqa.submit_time IS NOT NULL
            WHERE
                qa.quiz_id = $1
            GROUP BY
                qa.id, qa.turma_id, qa.start_time, qa.end_time, qa.application_date, c.nome, s.nome
            ORDER BY
                qa.start_time DESC`,
            [quizId]
        );

        res.status(200).json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching quiz applications:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching applications.' });
    }
};

const updateQuizApplication = async (req, res) => {
    const { applicationId } = req.params;
    const { startTime, endTime } = req.body;
    const professorId = req.user.id;

    if (!startTime) {
        return res.status(400).json({ success: false, message: 'Start time is required.' });
    }

    try {
        // Verify that the application belongs to a quiz owned by this professor
        const { rows: verifyRows } = await db.query(
            `SELECT qa.id 
             FROM public.quiz_applications qa
             JOIN public.quizzes q ON qa.quiz_id = q.id
             WHERE qa.id = $1 AND q.professor_id = $2`,
            [applicationId, professorId]
        );

        if (verifyRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found or you do not have permission to edit it.' 
            });
        }

        // Update the application
        await db.query(
            `UPDATE public.quiz_applications 
             SET start_time = $1, end_time = $2, updated_at = NOW()
             WHERE id = $3`,
            [startTime, endTime, applicationId]
        );

        res.status(200).json({ success: true, message: 'Application updated successfully.' });
    } catch (error) {
        console.error('Error updating quiz application:', error);
        res.status(500).json({ success: false, message: 'Internal server error while updating application.' });
    }
};

const deleteQuizApplication = async (req, res) => {
    const { applicationId } = req.params;
    const professorId = req.user.id;

    try {
        // Verify that the application belongs to a quiz owned by this professor
        const { rows: verifyRows } = await db.query(
            `SELECT qa.id 
             FROM public.quiz_applications qa
             JOIN public.quizzes q ON qa.quiz_id = q.id
             WHERE qa.id = $1 AND q.professor_id = $2`,
            [applicationId, professorId]
        );

        if (verifyRows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Application not found or you do not have permission to delete it.' 
            });
        }

        // Delete the application (CASCADE will handle related records)
        await db.query(
            'DELETE FROM public.quiz_applications WHERE id = $1',
            [applicationId]
        );

        res.status(200).json({ success: true, message: 'Application deleted successfully.' });
    } catch (error) {
        console.error('Error deleting quiz application:', error);
        res.status(500).json({ success: false, message: 'Internal server error while deleting application.' });
    }
};

// Export the new functions
module.exports = {
    createQuizApplication,
    getStudentQuizApplications,
    getQuizQuestions,
    submitQuizAttempt,
    getAppliedQuizzesByProfessor,
    getQuizApplicationResults,
    getQuizApplicationsByQuizId,  // NEW
    updateQuizApplication,        // NEW
    deleteQuizApplication,        // NEW
};
