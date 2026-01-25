const db = require('../../db');
const { sendEmail } = require('../../email');
const { getStudentsByClassId } = require('../../classes');

const createQuiz = async (req, res) => {
  try {
    const { disciplineId, title, questions, classId } = req.body;
    const professorId = req.user.id; // Assuming req.user is populated by authentication middleware

    if (!disciplineId || !title || !questions || questions.length === 0 || !classId) {
      return res.status(400).json({ success: false, message: 'Missing required quiz fields.' });
    }

    // Start a transaction
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert into quizzes table
      const quizResult = await client.query(
        `INSERT INTO quizzes (discipline_id, professor_id, title)
         VALUES ($1, $2, $3) RETURNING id, created_at`,
        [disciplineId, professorId, title]
      );
      const quizId = quizResult.rows[0].id;

      // 2. Insert into quiz_questions table
      for (const question of questions) {
        const { flashcardId, questionText, questionType, answers } = question;

        let actualFlashcardId = flashcardId;
        if (flashcardId && String(flashcardId).startsWith('custom-')) {
          actualFlashcardId = null; // Custom questions don't link to existing flashcards
        }

        let correctAnswerId = null;

        // Basic validation for answers and determine correct_answer_id
        if (questionType === 'image_occlusion_fill_in_the_blank') {
          // No single correct_answer_id for this type, options contain the labels
          if (!answers || answers.length === 0) {
            throw new Error('Image occlusion questions must have at least one occlusion label.');
          }
        } else { // For multiple_choice, true_false, etc.
          if (!answers || answers.length < 2) {
            throw new Error('Each question must have at least two answer options.');
          }
          const correctAnswers = answers.filter(a => a.isCorrect);
          if (correctAnswers.length !== 1) {
            throw new Error('Each question must have exactly one correct answer.');
          }
          correctAnswerId = correctAnswers[0].id;
        }

        await client.query(
          `INSERT INTO quiz_questions (quiz_id, flashcard_id, question_text, question_type, options, correct_answer_id)
           VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)`, // Cast question_text and options to JSONB
          [
            quizId,
            actualFlashcardId, // Use the adjusted flashcardId
            questionText, // This will be a JSON object from the frontend
            questionType, // Add questionType here
            JSON.stringify(answers.map(a => ({ id: a.id, text: a.text }))),
            correctAnswerId // This needs to be determined based on questionType
          ]
        );
      }

      await client.query('COMMIT');
      
      // Send email to students
      try {
        const students = await getStudentsByClassId(classId, disciplineId); // Pass disciplineId
        for (const student of students) {
          const subject = 'Novo Quiz Disponível';
          const html = `<p>Olá ${student.nome},</p><p>Um novo quiz "${title}" foi disponibilizado.</p>`;
          await sendEmail(student.email, subject, html);
        }
      } catch (emailError) {
        console.error('Failed to send quiz notification emails:', emailError);
        // Do not block the response for email errors
      }


      res.status(201).json({ success: true, message: 'Quiz created successfully', quizId });

    } catch (transactionError) {
      await client.query('ROLLBACK');
      console.error('Transaction Error creating quiz:', transactionError);
      res.status(500).json({ success: false, message: 'Failed to create quiz due to transaction error.', error: transactionError.message });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, message: 'Internal server error while creating quiz.', error: error.message });
  }
};

const getQuizzesByProfessor = async (req, res) => {
  try {
    const { professorId } = req.params;

    const result = await db.query(
      `SELECT
         q.id,
         q.title,
         q.created_at,
         s.nome AS discipline_name,
         s.id AS discipline_id
       FROM quizzes q
       JOIN subjects s ON q.discipline_id = s.id
       WHERE q.professor_id = $1
       ORDER BY q.created_at DESC`,
      [professorId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching quizzes by professor:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching quizzes.' });
  }
};

const getProfessorClassesByDiscipline = async (req, res) => {
  try {
    const { professorId, disciplineId } = req.params;

    const result = await db.query(
      `SELECT
         c.id,
         c.nome AS name,
         c.ano_letivo AS year
       FROM classes c
       JOIN disciplina_turma dt ON c.id = dt.turma_id
       WHERE dt.professor_id = $1 AND dt.disciplina_id = $2 AND dt.ativo = TRUE
       ORDER BY c.ano_letivo, c.nome`,
      [professorId, disciplineId]
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching professor classes by discipline:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching classes.' });
  }
};

const updateQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { disciplineId, title, questions } = req.body;
  const professorId = req.user.id;

  if (!disciplineId || !title || !questions || questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required quiz fields for update.' });
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Verify ownership
    const { rows: quizOwnerRows } = await client.query(
      'SELECT id FROM quizzes WHERE id = $1 AND professor_id = $2',
      [quizId, professorId]
    );
    if (quizOwnerRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this quiz or it does not exist.' });
    }

    // 2. Update basic quiz details
    await client.query(
      'UPDATE quizzes SET discipline_id = $1, title = $2, updated_at = NOW() WHERE id = $3',
      [disciplineId, title, quizId]
    );

    // 3. Delete existing questions
    await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

    // 4. Insert new questions
    for (const question of questions) {
      const { flashcardId, questionText, questionType, answers } = question;

      let actualFlashcardId = flashcardId;
      if (flashcardId && String(flashcardId).startsWith('custom-')) {
        actualFlashcardId = null; // Custom questions don't link to existing flashcards
      }

      let correctAnswerId = null;

      if (questionType === 'image_occlusion_fill_in_the_blank') {
        if (!answers || answers.length === 0) {
          throw new Error('Image occlusion questions must have at least one occlusion label.');
        }
      } else {
        if (!answers || answers.length < 2) {
          throw new Error('Each question must have at least two answer options.');
        }
        const correctAnswers = answers.filter(a => a.isCorrect);
        if (correctAnswers.length !== 1) {
          throw new Error('Each question must have exactly one correct answer.');
        }
        correctAnswerId = correctAnswers[0].id;
      }

      await client.query(
        `INSERT INTO quiz_questions (quiz_id, flashcard_id, question_text, question_type, options, correct_answer_id)
         VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)`,
        [
          quizId,
          actualFlashcardId,
          questionText,
          questionType,
          JSON.stringify(answers.map(a => ({ id: a.id, text: a.text }))),
          correctAnswerId
        ]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Quiz updated successfully' });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error updating quiz:', error);
    res.status(500).json({ success: false, message: 'Internal server error while updating quiz.', error: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
};

const getQuizResults = async (req, res) => {
  const { quizId } = req.params;

  try {
    // First, get the quiz title and discipline name
    const quizInfoQuery = `
      SELECT q.title, s.nome as "disciplineName"
      FROM quizzes q
      JOIN subjects s ON q.discipline_id = s.id
      WHERE q.id = $1;
    `;
    const quizInfoRes = await db.query(quizInfoQuery, [quizId]);

    if (quizInfoRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const { title: quizTitle, disciplineName } = quizInfoRes.rows[0];

    // Main query to get all attempts and answers for the quiz
    const resultsQuery = `
      SELECT
        sa.id as "attempt_id",
        sa.student_id,
        u.nome as "studentName",
        sa.attempt_number,
        sa.submit_time as "submitTime",
        sa.score,
        sa.passed,
        san.question_id as "questionId",
        qq.question_text as "questionText",
        san.chosen_option_id as "chosenOptionId",
        san.is_correct as "isCorrect"
      FROM student_quiz_attempts sa
      JOIN users u ON sa.student_id = u.id
      JOIN student_quiz_answers san ON sa.id = san.attempt_id
      JOIN quiz_questions qq ON san.question_id = qq.id
      WHERE sa.application_id IN (SELECT id FROM quiz_applications WHERE quiz_id = $1)
      ORDER BY sa.submit_time, san.question_id;
    `;

    const resultsRes = await db.query(resultsQuery, [quizId]);

    // Process the flat results into the desired nested structure
    const attemptsMap = new Map();
    resultsRes.rows.forEach(row => {
      if (!attemptsMap.has(row.attempt_id)) {
        attemptsMap.set(row.attempt_id, {
          attempt_id: row.attempt_id,
          studentName: row.studentName,
          attempt_number: row.attempt_number,
          submitTime: row.submitTime,
          score: row.score !== null ? parseFloat(row.score) : null,
          passed: row.passed,
          answers: [],
        });
      }
      attemptsMap.get(row.attempt_id).answers.push({
        questionId: row.questionId,
        questionText: row.questionText.text,
        chosenOptionId: row.chosenOptionId,
        isCorrect: row.isCorrect,
      });
    });

    const responseData = {
      quizTitle,
      disciplineName,
      attempts: Array.from(attemptsMap.values()),
    };

    res.status(200).json({ success: true, data: responseData });

  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ success: false, message: 'Internal server error while fetching quiz results.' });
  }
};

const getQuizById = async (req, res) => {
  const { quizId } = req.params;
  try {
    const quizQuery = 'SELECT q.id, q.title, q.discipline_id, s.nome as discipline_name FROM quizzes q JOIN subjects s ON q.discipline_id = s.id WHERE q.id = $1';
    const questionsQuery = 'SELECT id, flashcard_id, question_text, question_type, options, correct_answer_id FROM quiz_questions WHERE quiz_id = $1 ORDER BY id';

    const quizRes = await db.query(quizQuery, [quizId]);
    if (quizRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const questionsRes = await db.query(questionsQuery, [quizId]);

    const quiz = quizRes.rows[0];
    quiz.questions = questionsRes.rows;

    res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    console.error('Error fetching quiz by ID:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const deleteQuiz = async (req, res) => {
  const { quizId } = req.params;
  const professorId = req.user.id; // Assuming req.user is populated by authentication middleware

  try {
    // First, verify ownership.
    const { rows: quizOwnerRows } = await db.query(
      'SELECT id FROM quizzes WHERE id = $1 AND professor_id = $2',
      [quizId, professorId]
    );

    if (quizOwnerRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this quiz or it does not exist.' });
    }

    // Now, delete the quiz. ON DELETE CASCADE will handle the rest.
    await db.query('DELETE FROM quizzes WHERE id = $1', [quizId]);

    res.status(200).json({ success: true, message: 'Quiz deleted successfully' });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ success: false, message: 'Internal server error while deleting quiz.' });
  }
};

// Adicionar ao quiz.controller.js

const duplicateQuiz = async (req, res) => {
  const { quizId } = req.params;
  const { newTitle, newDisciplineId } = req.body;
  const professorId = req.user.id;

  if (!newTitle || !newDisciplineId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: newTitle and newDisciplineId are required.' 
    });
  }

  let client;
  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // 1. Verify that the original quiz exists and belongs to this professor
    const { rows: originalQuizRows } = await client.query(
      'SELECT id, title FROM quizzes WHERE id = $1 AND professor_id = $2',
      [quizId, professorId]
    );

    if (originalQuizRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Quiz not found or you do not have permission to duplicate it.' 
      });
    }

    // 2. Create the new quiz
    const { rows: newQuizRows } = await client.query(
      `INSERT INTO quizzes (discipline_id, professor_id, title)
       VALUES ($1, $2, $3) RETURNING id, created_at`,
      [newDisciplineId, professorId, newTitle]
    );
    const newQuizId = newQuizRows[0].id;

    // 3. Copy all questions from the original quiz
    const { rows: originalQuestions } = await client.query(
      `SELECT flashcard_id, question_text, question_type, options, correct_answer_id
       FROM quiz_questions
       WHERE quiz_id = $1
       ORDER BY id`,
      [quizId]
    );

    // 4. Insert copied questions into the new quiz
    for (const question of originalQuestions) {
      await client.query(
        `INSERT INTO quiz_questions (quiz_id, flashcard_id, question_text, question_type, options, correct_answer_id)
         VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)`,
        [
          newQuizId,
          question.flashcard_id,
          question.question_text,
          question.question_type,
          JSON.stringify(question.options),
          question.correct_answer_id
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ 
      success: true, 
      message: 'Quiz duplicated successfully',
      data: {
        newQuizId,
        questionsCount: originalQuestions.length
      }
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Error duplicating quiz:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error while duplicating quiz.',
      error: error.message 
    });
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Atualizar o module.exports para incluir a nova função
module.exports = {
  createQuiz,
  getQuizzesByProfessor,
  getProfessorClassesByDiscipline,
  updateQuiz,
  getQuizById,
  deleteQuiz,
  getQuizResults,
  duplicateQuiz,  // NOVA FUNÇÃO
};
