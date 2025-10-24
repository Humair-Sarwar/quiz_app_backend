


const UserAttemptedQuiz = require("../models/user_attempted_quiz");
const mongoose = require("mongoose");

const Quiz = require("../models//quiz_list");
const Category = require("../models/category");

const quizSaveQuestion = async (req, res, next) => {
  try {
    const {
      user_id,
      quiz_id,
      quiz_title,
      quiz_sort_order,
      quiz_time,
      question_group,
    } = req.body;

    // ✅ Basic validation
    if (!user_id || !quiz_id || !question_group || !Array.isArray(question_group)) {
      return res.status(400).json({
        status: 400,
        message: "Missing required fields or invalid question data",
      });
    }

    // ✅ Check if quiz attempt already exists for this user
    let existingAttempt = await UserAttemptedQuiz.findOne({ user_id, quiz_id });

    if (!existingAttempt) {
      // 🆕 Create new attempt if not exist
      const newAttempt = await UserAttemptedQuiz.create({
        user_id,
        quiz_id,
        quiz_title,
        quiz_sort_order,
        quiz_time,
        question_group,
      });

      return res.status(201).json({
        status: 201,
        message: "Quiz attempt created successfully!",
        data: newAttempt,
      });
    } else {
      // 🔁 Add new question(s) to existing quiz attempt
      await UserAttemptedQuiz.updateOne(
        { user_id, quiz_id },
        { $push: { question_group: { $each: question_group } } }
      );

      const updatedAttempt = await UserAttemptedQuiz.findOne({ user_id, quiz_id });

      return res.status(200).json({
        status: 200,
        message: "Question added successfully to quiz attempt!",
        data: updatedAttempt,
      });
    }
  } catch (error) {
    console.error("quizSaveQuestion error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};








const getQuizResult = async (req, res, next) => {
  try {
    const { id } = req.body; // attempted quiz _id (UserAttemptedQuiz._id)

    // ✅ Find attempted quiz
    const attemptedQuiz = await UserAttemptedQuiz.findById(id).lean();
    if (!attemptedQuiz) {
      return res.status(404).json({
        status: 404,
        message: "Attempted quiz not found!",
      });
    }

    // ✅ Get quiz_id (could be ObjectId or string)
    const quizId = attemptedQuiz.quiz_id;

    let originalQuiz;

    // ✅ Check if quiz_id is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(quizId)) {
      originalQuiz = await Quiz.findById(quizId).lean();
    } else {
      // If quiz_id is custom string, match manually
      originalQuiz = await Quiz.findOne({ quiz_id: quizId }).lean();
    }

    if (!originalQuiz) {
      return res.status(404).json({
        status: 404,
        message: "Original quiz not found!",
      });
    }

    // ✅ Compare user answers with original quiz
    const userQuestions = attemptedQuiz.question_group || [];
    const originalQuestions = originalQuiz.question_group || [];

    let totalQuestions = originalQuestions.length;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    userQuestions.forEach((userQ, index) => {
      const originalQ = originalQuestions[index];
      if (!originalQ) return skipped++;

      const correctOptions = originalQ.options.filter(o => o.answer).map(o => o.option_label);
      const selectedOptions = userQ.options.filter(o => o.answer).map(o => o.option_label);

      if (selectedOptions.length === 0) {
        skipped++;
      } else if (
        correctOptions.length === selectedOptions.length &&
        correctOptions.every(label => selectedOptions.includes(label))
      ) {
        correct++;
      } else {
        incorrect++;
      }
    });

    // ✅ Return result summary
    return res.status(200).json({
      status: 200,
      message: "Quiz result calculated successfully!",
      result: {
        totalQuestions,
        correct,
        incorrect,
        skipped,
      },
    });

  } catch (error) {
    console.error("getQuizResult error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};







const reviewQuiz = async (req, res) => {
  try {
    const { id } = req.body; // attempted quiz _id

    if (!id) {
      return res.status(400).json({
        status: 400,
        message: "Attempted quiz ID is required!",
      });
    }

    // ✅ Get attempted quiz
    const attempted = await UserAttemptedQuiz.findById(id).lean();
    if (!attempted) {
      return res.status(404).json({
        status: 404,
        message: "Attempted quiz not found!",
      });
    }

    // ✅ Get original quiz by quiz_id (string)
    const originalQuiz = await Quiz.findOne({ _id: attempted.quiz_id }).lean();
    if (!originalQuiz) {
      return res.status(404).json({
        status: 404,
        message: "Original quiz not found!",
      });
    }

    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    // ✅ Build detailed review
    const review = attempted.question_group.map((attemptedQ) => {
      const originalQ = originalQuiz.question_group.find(
        (q) => q.question_title === attemptedQ.question_title
      );

      if (!originalQ) {
        skipped++;
        return {
          question_title: attemptedQ.question_title,
          question_time: attemptedQ.question_time || "",
          options: [],
        };
      }

      const options = attemptedQ.options.map((opt) => {
        const adminOpt = originalQ.options.find(
          (o) => o.option_label === opt.option_label
        );

        const is_user_choice = !!opt.answer;
        const is_admin_choice = adminOpt ? !!adminOpt.answer : false;

        // ✅ Determine if user was correct on this option
        const is_correct = is_user_choice && is_admin_choice;

        if (is_correct) correct++;
        else if (is_user_choice && !is_admin_choice) incorrect++;

        return {
          title: opt.option_label,
          is_user_choice,
          sort_order: opt.option_sort_order,
          is_admin_choice,
          is_correct,
        };
      });

      // ✅ Check skipped
      if (!attemptedQ.options.some((o) => o.answer)) skipped++;

      return {
        question_title: attemptedQ.question_title,
        question_time: attemptedQ.question_time || "",
        options,
      };
    });

    // ✅ Summary
    const summary = {
      totalQuestions: attempted.question_group.length,
      correct,
      incorrect,
      skipped,
    };

    return res.status(200).json({
      status: 200,
      message: "Quiz review fetched successfully!",
      summary,
      review,
    });
  } catch (error) {
    console.error("reviewQuiz error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};




const retakeQuiz = async (req, res) => {
  try {
    const { id, user_id } = req.body;

    // ✅ Validate input
    if (!id || !user_id) {
      return res.status(400).json({
        status: 400,
        message: "id and user_id are required!",
      });
    }

    // ✅ Check if attempted quiz exists for this user
    const attemptedQuiz = await UserAttemptedQuiz.findOne({
      _id: id,
      user_id: user_id,
    });

    if (!attemptedQuiz) {
      return res.status(404).json({
        status: 404,
        message: "Attempted quiz not found for this user!",
      });
    }

    // ✅ Delete the attempted quiz
    await UserAttemptedQuiz.deleteOne({ _id: id, user_id: user_id });

    return res.status(200).json({
      status: 200,
      message: "Quiz retake initialized successfully! Attempted quiz deleted.",
    });
  } catch (error) {
    console.error("retakeQuiz error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};










const getUserAttemptedQuizzes = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required!",
      });
    }

    // ✅ Find all attempted quizzes for this user
    const attemptedQuizzes = await UserAttemptedQuiz.find({ user_id }).lean();

    if (!attemptedQuizzes.length) {
      return res.status(404).json({
        status: 404,
        message: "No attempted quizzes found for this user!",
      });
    }

    // ✅ Process each attempted quiz
    const results = await Promise.all(
      attemptedQuizzes.map(async (attempted) => {
        const quiz = await Quiz.findOne({ _id: attempted.quiz_id }).lean();

        if (!quiz) {
          return {
            quiz_id: attempted.quiz_id,
            quiz_title: attempted.quiz_title,
            message: "Original quiz not found for comparison",
            questions: [],
          };
        }

        // Compare answers
        const questions = attempted.question_group.map((userQ) => {
          const adminQ = quiz.question_group.find(
            (q) => q.question_title === userQ.question_title
          );

          const options = userQ.options.map((userOpt) => {
            const adminOpt = adminQ?.options.find(
              (a) => a.option_label === userOpt.option_label
            );

            const isCorrect =
              userOpt.answer === true && adminOpt?.answer === true;

            return {
              title: userOpt.option_label,
              is_user_choice: userOpt.answer,
              sort_order: userOpt.option_sort_order,
              is_admin_choice: adminOpt?.answer || false,
              is_correct: isCorrect,
            };
          });

          return {
            question_title: userQ.question_title,
            question_time: userQ.question_time,
            options,
          };
        });

        // ✅ Calculate summary
        let correct = 0,
          incorrect = 0,
          skipped = 0;
        questions.forEach((q) => {
          const userAnswered = q.options.some((opt) => opt.is_user_choice);
          const questionCorrect = q.options.some((opt) => opt.is_correct);

          if (!userAnswered) skipped++;
          else if (questionCorrect) correct++;
          else incorrect++;
        });

        return {
          quiz_id: attempted.quiz_id,
          quiz_title: attempted.quiz_title,
          total_questions: questions.length,
          summary: {
            totalQuestions: questions.length,
            correct,
            incorrect,
            skipped,
          },
          questions,
        };
      })
    );

    // ✅ Send response
    return res.status(200).json({
      status: 200,
      message: "User attempted quizzes fetched successfully!",
      data: results,
    });
  } catch (error) {
    console.error("getUserAttemptedQuizzes error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};







const getSolvedQuizList = async (req, res, next) => {
  try {
    const { 
      user_id, 
      search = "", 
      page = 1, 
      limit = 10 
    } = req.body;

    // 🧠 Validate
    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required",
      });
    }

    // 🧭 Pagination setup
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ⚡ Get total count for pagination
    const totalCount = await UserAttemptedQuiz.countDocuments({ user_id });

    // 🧩 Fetch attempted quizzes with pagination, latest first
    const attemptedQuizzes = await UserAttemptedQuiz.find({ user_id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    if (!attemptedQuizzes.length) {
      return res.status(404).json({
        status: 404,
        message: "No attempted quizzes found for this user!",
      });
    }

    const results = [];

    // ⚙️ Loop through each attempted quiz
    for (const attempt of attemptedQuizzes) {
      const quiz = await Quiz.findById(attempt.quiz_id)
        .populate("category_id", "category_name")
        .lean();

      if (!quiz) continue;

      // 🕵️ Search filter (by quiz or category name)
      if (
        search &&
        !(
          quiz.quiz_title.toLowerCase().includes(search.toLowerCase()) ||
          quiz.category_id?.category_name
            ?.toLowerCase()
            .includes(search.toLowerCase())
        )
      ) {
        continue;
      }

      let correct = 0;
      let incorrect = 0;
      let skipped = 0;

      // 🧮 Compare answers
      quiz.question_group?.forEach((question, index) => {
        const userQuestion = attempt.question_group?.[index];
        if (!userQuestion) {
          skipped++;
          return;
        }

        const correctOption = question.options.find(o => o.answer === true);
        const userChoice = userQuestion.options.find(o => o.answer === true);

        if (!userChoice) {
          skipped++;
        } else if (
          correctOption &&
          userChoice.option_label === correctOption.option_label
        ) {
          correct++;
        } else {
          incorrect++;
        }
      });

      results.push({
        quiz_title: quiz.quiz_title,
        category_name: quiz.category_id?.category_name || "N/A",
        total_questions: quiz.question_group?.length || 0,
        correct,
        incorrect,
        skipped,
        attempted_on: attempt.createdAt,
      });
    }

    // 🧹 After search filter, reapply pagination on final result if needed
    const paginatedResults = results.slice(0, limitNum);

    return res.status(200).json({
      status: 200,
      message: "Solved quiz list fetched successfully!",
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
      data: paginatedResults,
    });
  } catch (error) {
    console.error("getSolvedQuizList error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};






module.exports = { quizSaveQuestion, getQuizResult, reviewQuiz, retakeQuiz, getUserAttemptedQuizzes, getSolvedQuizList };
