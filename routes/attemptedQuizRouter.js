const { quizSaveQuestion, getQuizResult, reviewQuiz, retakeQuiz, getUserAttemptedQuizzes, getSolvedQuizList } = require('../controllers/QuizSaveQuestion');
const auth = require('../middlewares/Authentication');

const router = require('express').Router();


router.post('/quiz/save-question', auth, quizSaveQuestion);

router.get('/quiz/get-result', auth, getQuizResult);

router.get('/quiz/review-result', auth, reviewQuiz);

router.delete('/quiz/retake', auth, retakeQuiz);

router.get('/admin/all-user-attempted-quiz', auth, getUserAttemptedQuizzes);


router.get('/quiz/all-user-attempted-quiz-list', auth, getSolvedQuizList);

module.exports = router;