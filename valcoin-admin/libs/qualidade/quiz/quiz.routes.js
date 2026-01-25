// quiz.routes.js - Atualizado

const express = require('express');
const router = express.Router();
const quizController = require('./quiz.controller');

// Route to create a new quiz
router.post('/', quizController.createQuiz);

// Route to duplicate an existing quiz
router.post('/:quizId/duplicate', quizController.duplicateQuiz);

// Route to get all quizzes by a specific professor
router.get('/professor/:professorId', quizController.getQuizzesByProfessor);

// Route to get classes for a professor and discipline
router.get('/turmas/professor/:professorId/disciplina/:disciplineId', quizController.getProfessorClassesByDiscipline);

// Route to get a single quiz by ID
router.get('/:quizId', quizController.getQuizById);

// Route to update a quiz
router.put('/:quizId', quizController.updateQuiz);

// Route to get quiz results
router.get('/:quizId/results', quizController.getQuizResults);

// Route to delete a quiz
router.delete('/:quizId', quizController.deleteQuiz);

module.exports = router;
