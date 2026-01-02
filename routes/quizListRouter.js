const {
  createQuiz,
  deleteQuiz,
  updateQuiz,
  getAllQuiz,
  getAllQuizWebsite,
  getQuizById,
} = require("../controllers/QuizListController");
const auth = require("../middlewares/Authentication");

const router = require("express").Router();

router.post("/quiz-create", auth, createQuiz);

router.delete("/quiz-delete", auth, deleteQuiz);

router.put("/quiz-update", auth, updateQuiz);

router.get("/quiz-all", auth, getAllQuiz);

router.get("/quiz-all-website", getAllQuizWebsite);

router.get("/quiz/:quiz_id", getQuizById);

module.exports = router;
