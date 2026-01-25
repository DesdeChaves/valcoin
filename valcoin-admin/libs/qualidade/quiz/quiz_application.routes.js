// quiz_application.routes.js - Atualizado

const express = require('express');
const router = express.Router();
const quizApplicationController = require('./quiz_application.controller');

// Existing routes
router.post('/', quizApplicationController.createQuizApplication);
router.get('/professor', quizApplicationController.getAppliedQuizzesByProfessor);
router.get('/:applicationId/results', quizApplicationController.getQuizApplicationResults);

// NEW routes for managing applications
router.get('/quiz/:quizId', quizApplicationController.getQuizApplicationsByQuizId);
router.put('/:applicationId', quizApplicationController.updateQuizApplication);
router.delete('/:applicationId', quizApplicationController.deleteQuizApplication);

module.exports = router;
