const express = require('express');
const router = express.Router();
const quizApplicationController = require('./quiz_application.controller');

router.get('/', quizApplicationController.getStudentQuizApplications);
router.get('/:quizApplicationId/questions', quizApplicationController.getQuizQuestions);
router.post('/:quizApplicationId/submit', quizApplicationController.submitQuizAttempt);

module.exports = router;
