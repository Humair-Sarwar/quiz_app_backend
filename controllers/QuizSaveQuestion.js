const UserAttemptedQuiz = require("../models/user_attempted_quiz");
const mongoose = require("mongoose");

const Quiz = require("../models//quiz_list");

const quizSaveQuestion = async (req, res) => {
  try {
    const {
      user_id,
      quiz_id,
      quiz_title,
      quiz_sort_order,
      quiz_time,
      question_group,
    } = req.body;

    if (
      !user_id ||
      !quiz_id ||
      !question_group ||
      !Array.isArray(question_group)
    ) {
      return res
        .status(400)
        .json({ status: 400, message: "Required fields are missing!" });
    }

    const masterQuiz = await Quiz.findById(quiz_id);
    if (!masterQuiz) {
      return res
        .status(404)
        .json({ status: 404, message: "Original Quiz not found!" });
    }

    const processedQuestions = question_group.map((studentQ) => {
      const masterQ = masterQuiz.question_group.find(
        (mq) => mq.question_title === studentQ.question_title
      );

      return {
        question_title: studentQ.question_title,
        question_sort_order:
          studentQ.question_sort_order || masterQ?.question_sort_order || 1,
        question_type: studentQ.question_type || masterQ?.question_type || 1, // Fixes the validation error
        question_time: studentQ.question_time || masterQ?.question_time || "",
        options: studentQ.options.map((studentOpt) => {
          const masterOpt = masterQ?.options.find(
            (mo) => mo.option_label === studentOpt.option_label
          );

          return {
            option_label: studentOpt.option_label,
            option_sort_order:
              studentOpt.option_sort_order || masterOpt?.option_sort_order || 1,
            is_correct: masterOpt ? masterOpt.answer : false,
            answer: studentOpt.answer || false,
          };
        }),
      };
    });

    let existingAttempt = await UserAttemptedQuiz.findOne({ user_id, quiz_id });

    if (!existingAttempt) {
      const newAttempt = await UserAttemptedQuiz.create({
        user_id,
        quiz_id,
        quiz_title,
        quiz_sort_order,
        quiz_time,
        question_group: processedQuestions,
      });
      return res.status(201).json({ status: 201, data: newAttempt });
    } else {
      const updated = await UserAttemptedQuiz.findOneAndUpdate(
        { user_id, quiz_id },
        { $push: { question_group: { $each: processedQuestions } } },
        { new: true }
      );
      return res.status(200).json({ status: 200, data: updated });
    }
  } catch (error) {
    console.error("Save Error:", error);
    return res.status(500).json({ status: 500, error: error.message });
  }
};

const getQuizResult = async (req, res, next) => {
  try {
    const { id } = req.query;

    const attemptedQuiz = await UserAttemptedQuiz.findById(id).lean();
    if (!attemptedQuiz) {
      return res
        .status(404)
        .json({ status: 404, message: "Attempted quiz not found!" });
    }

    const quizId = attemptedQuiz.quiz_id;
    let originalQuiz;

    if (mongoose.Types.ObjectId.isValid(quizId)) {
      originalQuiz = await Quiz.findById(quizId).lean();
    } else {
      originalQuiz = await Quiz.findOne({ quiz_id: quizId }).lean();
    }

    if (!originalQuiz) {
      return res
        .status(404)
        .json({ status: 404, message: "Original quiz not found!" });
    }

    const userQuestions = attemptedQuiz.question_group || [];
    const originalQuestions = originalQuiz.question_group || [];

    let totalQuestions = originalQuestions.length;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;

    const detailed_questions = originalQuestions.map((originalQ) => {
      const userQ = userQuestions.find(
        (uq) => uq.question_title === originalQ.question_title
      );

      const correctOpt = originalQ.options.find((o) => o.answer === true);
      const userOpt = userQ?.options?.find((o) => o.answer === true);

      const all_options = originalQ.options.map((opt) => ({
        label: opt.option_label,
        is_correct: opt.answer === true,
      }));

      let status = "skipped";
      if (userOpt) {
        status =
          userOpt.option_label === correctOpt?.option_label
            ? "correct"
            : "incorrect";
        status === "correct" ? correct++ : incorrect++;
      } else {
        skipped++;
      }

      return {
        question_title: originalQ.question_title,
        status,
        user_choice: userOpt?.option_label || null,
        correct_answer: correctOpt?.option_label || null,
        all_options,
      };
    });

    const score =
      totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

    return res.status(200).json({
      status: 200,
      message: "Result calculated!",
      data: {
        attempted_quiz_id: attemptedQuiz._id,
        total_questions: totalQuestions,
        correct,
        incorrect,
        skipped,
        score,
        detailed_questions,
      },
    });
  } catch (error) {
    console.error("Error in getQuizResult:", error);
    return res.status(500).json({ status: 500, message: "Internal Error" });
  }
};

const reviewQuiz = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        status: 400,
        message: "Attempted quiz ID is required!",
      });
    }

    const attempted = await UserAttemptedQuiz.findById(id).lean();
    if (!attempted) {
      return res.status(404).json({
        status: 404,
        message: "Attempted quiz not found!",
      });
    }

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

      if (!attemptedQ.options.some((o) => o.answer)) skipped++;

      return {
        question_title: attemptedQ.question_title,
        question_time: attemptedQ.question_time || "",
        options,
      };
    });

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

    if (!id || !user_id) {
      return res.status(400).json({
        status: 400,
        message: "id and user_id are required!",
      });
    }

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
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required!",
      });
    }
    const attemptedQuizzes = await UserAttemptedQuiz.find({ user_id }).lean();

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
    const { user_id, search = "", page = 1, limit = 10 } = req.query;

    if (!user_id) {
      return res
        .status(400)
        .json({ status: 400, message: "user_id is required" });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const allAttempts = await UserAttemptedQuiz.find({ user_id })
      .sort({ createdAt: -1 })
      .lean();

    const processedResults = [];

    for (const attempt of allAttempts) {
      const quiz = await Quiz.findById(attempt.quiz_id)
        .populate("category_id", "category_name")
        .lean();

      if (!quiz) continue;

      const quizTitle = quiz.quiz_title || "Untitled Quiz";
      const categoryName = quiz.category_id?.category_name || "Uncategorized";

      if (
        search &&
        !(
          quizTitle.toLowerCase().includes(search.toLowerCase()) ||
          categoryName.toLowerCase().includes(search.toLowerCase())
        )
      ) {
        continue;
      }

      let correct = 0;
      let incorrect = 0;
      let skipped = 0;

      const questionBreakdown = quiz.question_group?.map((adminQ) => {
        const userQ = attempt.question_group?.find(
          (uq) => uq.question_title === adminQ.question_title
        );

        const correctOpt = adminQ.options.find((o) => o.answer === true);
        const userOpt = userQ?.options?.find((o) => o.answer === true);

        const allOptions = adminQ.options.map((opt) => ({
          label: opt.option_label,
          is_correct: opt.answer === true,
        }));

        let status = "skipped";
        if (userOpt) {
          if (userOpt.option_label === correctOpt?.option_label) {
            status = "correct";
            correct++;
          } else {
            status = "incorrect";
            incorrect++;
          }
        } else {
          skipped++;
        }

        return {
          question_title: adminQ.question_title,
          status,
          user_choice: userOpt?.option_label || null,
          correct_answer: correctOpt?.option_label || null,
          options: allOptions,
        };
      });

      processedResults.push({
        attempted_quiz_id: attempt._id,
        quiz_id: quiz._id,
        quiz_title: quizTitle,
        category_name: categoryName,
        total_questions: quiz.question_group?.length || 0,
        correct,
        incorrect,
        skipped,
        attempted_on: attempt.createdAt,
        detailed_questions: questionBreakdown,
      });
    }

    const totalFiltered = processedResults.length;
    const paginatedData = processedResults.slice(skip, skip + limitNum);

    const firstRecord = totalFiltered === 0 ? 0 : skip + 1;
    const lastRecord = Math.min(skip + paginatedData.length, totalFiltered);

    return res.status(200).json({
      status: 200,
      message: "Solved quiz list fetched successfully!",
      pagination: {
        totalItems: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limitNum),
        currentPage: pageNum,
        limit: limitNum,
        firstRecord,
        lastRecord,
      },
      data: paginatedData,
    });
  } catch (error) {
    console.error("getSolvedQuizList error:", error);
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
};

module.exports = {
  quizSaveQuestion,
  getQuizResult,
  reviewQuiz,
  retakeQuiz,
  getUserAttemptedQuizzes,
  getSolvedQuizList,
};
