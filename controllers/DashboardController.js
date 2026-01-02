const mongoose = require("mongoose");
const Category = require("../models/category");
const QuizList = require("../models/quiz_list");
const User = require("../models/user");
const UserAttemptedQuiz = require("../models/user_attempted_quiz");

const adminCounts = async (req, res, next) => {
  try {
    const [
      totalCategories,
      totalQuizzes,
      totalCustomers,
      totalAttemptedQuizzes,
      quizzes,
      latestCategoriesWithQuizzes,
      topRecentUsers,
    ] = await Promise.all([
      Category.countDocuments(),
      QuizList.countDocuments(),
      User.countDocuments({ type: 1 }),
      UserAttemptedQuiz.countDocuments(),
      QuizList.find({}, "question_group").lean(),

      Category.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: "quiz-list",
            localField: "_id",
            foreignField: "category_id",
            as: "quiz_list",
          },
        },
        {
          $project: {
            category_name: 1,
            category_image: 1,
            createdAt: 1,
            quiz_list: {
              $filter: {
                input: { $ifNull: ["$quiz_list", []] },
                as: "quiz",
                cond: { $eq: ["$$quiz.status", true] },
              },
            },
            active_quiz_count: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$quiz_list", []] },
                  as: "quiz",
                  cond: { $eq: ["$$quiz.status", true] },
                },
              },
            },
          },
        },
      ]),

      UserAttemptedQuiz.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: "users",
            let: { uId: "$user_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$_id",
                      {
                        $convert: {
                          input: "$$uId",
                          to: "objectId",
                          onError: null,
                          onNull: null,
                        },
                      },
                    ],
                  },
                },
              },
              { $project: { name: 1, image: 1, email: 1 } },
            ],
            as: "user_details",
          },
        },
        {
          $unwind: { path: "$user_details", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "quiz-list",
            let: { qId: "$quiz_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$_id",
                      {
                        $convert: {
                          input: "$$qId",
                          to: "objectId",
                          onError: null,
                          onNull: null,
                        },
                      },
                    ],
                  },
                },
              },
              { $project: { category_id: 1 } },
            ],
            as: "quiz_details",
          },
        },
        {
          $unwind: { path: "$quiz_details", preserveNullAndEmptyArrays: true },
        },
        {
          $lookup: {
            from: "categories",
            localField: "quiz_details.category_id",
            foreignField: "_id",
            as: "cat_details",
          },
        },
        { $unwind: { path: "$cat_details", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            user_name: { $ifNull: ["$user_details.name", "Unknown User"] },
            user_image: { $ifNull: ["$user_details.image", ""] },
            user_email: { $ifNull: ["$user_details.email", "N/A"] },
            quiz_title: 1,
            category_name: { $ifNull: ["$cat_details.category_name", "N/A"] },
            attempted_at: "$createdAt",

            correct_answers: {
              $reduce: {
                input: "$question_group",
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $cond: [
                        {
                          $gt: [
                            {
                              $size: {
                                $filter: {
                                  input: "$$this.options",
                                  as: "opt",
                                  cond: {
                                    $and: [
                                      { $eq: ["$$opt.answer", true] },
                                      { $eq: ["$$opt.is_correct", true] },
                                    ],
                                  },
                                },
                              },
                            },
                            0,
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  ],
                },
              },
            },
            total_questions: { $size: "$question_group" },
          },
        },
        {
          $addFields: {
            score_percentage: {
              $cond: [
                { $gt: ["$total_questions", 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: ["$correct_answers", "$total_questions"] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                0,
              ],
            },
          },
        },
      ]),
    ]);

    const totalQuestions = quizzes.reduce(
      (sum, quiz) => sum + (quiz.question_group?.length || 0),
      0
    );

    const stats = {
      totalCategories,
      totalQuizzes,
      totalQuestions,
      totalCustomers,
      totalAttemptedQuizzes,
      latestCategories: latestCategoriesWithQuizzes,
      topRecentUsers: topRecentUsers,
    };

    return res.status(200).json({
      status: 200,
      message: "Admin dashboard stats updated successfully!",
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

module.exports = { adminCounts };
