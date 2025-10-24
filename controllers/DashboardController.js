const Category = require("../models/category");
const QuizList = require("../models/quiz_list");
const User = require("../models/user");
const UserAttemptedQuiz = require("../models/user_attempted_quiz");



const adminCounts = async (req, res, next) => {
  try {
    // ✅ Fetch all counts in parallel for speed
    const [
      totalCategories,
      totalQuizzes,
      totalCustomers,
      totalAttemptedQuizzes,
      quizzes,
    ] = await Promise.all([
      Category.countDocuments(),
      QuizList.countDocuments(),
      User.countDocuments({ type: 2 }), // assuming you have 'type' field
      UserAttemptedQuiz.countDocuments(),
      QuizList.find({}, "question_group").lean(), // only fetch question_group to count questions
    ]);

    // ✅ Count total questions across all quizzes
    const totalQuestions = quizzes.reduce(
      (sum, quiz) => sum + (quiz.question_group?.length || 0),
      0
    );

    // ✅ Optional: total options across all quizzes (useful for insights)
    const totalOptions = quizzes.reduce((sum, quiz) => {
      return (
        sum +
        quiz.question_group.reduce(
          (subSum, q) => subSum + (q.options?.length || 0),
          0
        )
      );
    }, 0);

    // ✅ Build response object
    const stats = {
      totalCategories,
      totalQuizzes,
      totalQuestions,
      totalOptions,
      totalCustomers,
      totalAttemptedQuizzes,
    };

    // ✅ Send response
    return res.status(200).json({
      status: 200,
      message: "Admin dashboard stats fetched successfully!",
      data: stats,
    });
  } catch (error) {
    console.error("adminCounts error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
    adminCounts
}