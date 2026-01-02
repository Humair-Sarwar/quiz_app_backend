const Quiz = require("../models/quiz_list");
const Category = require("../models/category");
const Joi = require("joi");
const UserAttemptedQuiz = require("../models/user_attempted_quiz");

const createQuiz = async (req, res, next) => {
  const optionSchema = Joi.object({
    option_label: Joi.string().required(),
    option_sort_order: Joi.number().default(1),
    answer: Joi.boolean().default(false),
  });

  const questionSchema = Joi.object({
    question_title: Joi.string().required(),
    question_sort_order: Joi.number().default(1),
    question_type: Joi.number().required(),
    question_time: Joi.string().allow("").optional(),
    options: Joi.array().items(optionSchema).min(1).required(),
  });

  const quizSchema = Joi.object({
    quiz_title: Joi.string().required(),
    quiz_sort_order: Joi.number().default(1),
    quiz_time: Joi.string().allow("").optional(),
    category_id: Joi.string().required(),
    question_group: Joi.array().items(questionSchema).min(1).required(),
    business_id: Joi.string().required(),
    image: Joi.string().allow("").optional(),
    status: Joi.boolean().required(),
  });

  const { error, value } = quizSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      status: 400,
      message: "Validation error",
      errors: error.details.map((d) => d.message),
    });
  }

  try {
    const quiz = new Quiz(value);
    await quiz.save();

    return res.status(201).json({
      status: 201,
      message: "Quiz created successfully!",
    });
  } catch (err) {
    console.error("Quiz creation failed:", err);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

const deleteQuiz = async (req, res, next) => {
  const deleteQuizSchema = Joi.object({
    id: Joi.string().required(),
    business_id: Joi.string().required(),
  });
  const { error, value } = deleteQuizSchema.validate({ ...req.body });

  if (error) {
    return next(error);
  }
  try {
    const quiz = await Quiz.findOne({ _id: value.id });
    if (!quiz) {
      return res.status(404).json({ status: 409, message: "Quiz not found!" });
    }
    const businessId = await Quiz.findOne({ business_id: value.business_id });
    if (!businessId) {
      return res.status(404).json({ status: 409, message: "Quiz not found!" });
    }
    const result = await Quiz.deleteOne({
      business_id: value.business_id,
      _id: value.id,
    });
    return res
      .status(200)
      .json({ status: 200, message: "Quiz deleted successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!", error });
  }
};

const updateQuiz = async (req, res, next) => {
  const optionSchema = Joi.object({
    option_label: Joi.string().required(),
    option_sort_order: Joi.number().default(1),
    answer: Joi.boolean().default(false),
  });

  const questionSchema = Joi.object({
    question_title: Joi.string().required(),
    question_sort_order: Joi.number().default(1),
    question_type: Joi.number().required(),
    question_time: Joi.string().allow("").optional(),
    options: Joi.array().items(optionSchema).min(1).required(),
  });

  const quizSchema = Joi.object({
    id: Joi.string().required(),
    business_id: Joi.string().required(),
    quiz_title: Joi.string().optional(),
    quiz_sort_order: Joi.number().optional(),
    quiz_time: Joi.string().optional(),
    image: Joi.string().allow("").optional(),
    category_id: Joi.string().optional(),
    question_group: Joi.array().items(questionSchema).optional(),
    status: Joi.boolean().required(),
  });

  const { error, value } = quizSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      status: 400,
      message: "Validation error",
      errors: error.details.map((d) => d.message),
    });
  }

  const { business_id } = value;
  const { id } = req.body;

  try {
    const quiz = await Quiz.findOne({ _id: id, business_id });

    if (!quiz) {
      return res.status(404).json({
        status: 404,
        message: "Quiz not found for this business_id and id",
      });
    }

    Object.assign(quiz, value);
    await quiz.save();

    return res.status(200).json({
      status: 200,
      message: "Quiz updated successfully!",
    });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

const getAllQuiz = async (req, res) => {
  try {
    const source = req.query.business_id ? req.query : req.body;
    const {
      business_id,
      category_id,
      search = "",
      page = 1,
      limit = 10,
    } = source;

    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    const query = { business_id };
    if (category_id) query.category_id = category_id;
    if (search.trim()) query.quiz_title = { $regex: search, $options: "i" };

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      Quiz.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: "category_id",
          model: "Category",
          select: "category_name",
        })
        .lean(),
      Quiz.countDocuments(query),
    ]);

    const mappedData = data.map((quiz) => ({
      ...quiz,
      category_name: quiz.category_id?.category_name || "N/A",
      category_id: quiz.category_id?._id || quiz.category_id,
      total_questions: Array.isArray(quiz.question_group)
        ? quiz.question_group.length
        : 0,
    }));

    const firstRecord = total === 0 ? 0 : skip + 1;
    const lastRecord = Math.min(skip + mappedData.length, total);

    return res.status(200).json({
      status: 200,
      message: "Quiz list fetched successfully!",
      data: mappedData,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        limit: limitNum,
        firstRecord,
        lastRecord,
      },
    });
  } catch (err) {
    console.error("getAllQuiz error:", err);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

const getAllQuizWebsite = async (req, res, next) => {
  try {
    const {
      category_slug,
      search = "",
      page = 1,
      limit = 10,
      user_id,
    } = req.query;

    if (!category_slug) {
      return res
        .status(400)
        .json({ status: 400, message: "category_slug is required" });
    }

    const category = await Category.findOne({ slug: category_slug }).lean();
    if (!category) {
      return res
        .status(404)
        .json({ status: 404, message: "Category not found!" });
    }

    const query = {
      category_id: category._id,
      status: true,
    };

    if (search.trim()) {
      query.quiz_title = { $regex: search, $options: "i" };
    }

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const [quizzes, total] = await Promise.all([
      Quiz.find(query)
        .sort({ quiz_sort_order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Quiz.countDocuments(query),
    ]);

    let attemptedQuizMap = {};
    if (user_id && quizzes.length > 0) {
      const quizIds = quizzes.map((q) => q._id);
      const attempts = await UserAttemptedQuiz.find({
        user_id: user_id,
        quiz_id: { $in: quizIds },
      })
        .sort({ createdAt: -1 })
        .select("quiz_id _id")
        .lean();

      attempts.forEach((attempt) => {
        if (!attemptedQuizMap[attempt.quiz_id.toString()]) {
          attemptedQuizMap[attempt.quiz_id.toString()] = attempt._id;
        }
      });
    }

    const formatted = quizzes.map((q) => ({
      _id: q._id,
      quiz_title: q.quiz_title,
      quiz_time: q.quiz_time,
      image: q.image,
      business_id: q.business_id,
      category_id: q.category_id,
      status: q.status,
      total_questions: q.question_group?.length || 0,
      createdAt: q.createdAt,
      attempted_quiz_id: attemptedQuizMap[q._id.toString()] || null,
    }));

    return res.status(200).json({
      status: 200,
      message: "Quiz list fetched successfully!",
      data: formatted,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        limit: limitNum,
        firstRecord: total === 0 ? 0 : skip + 1,
        lastRecord: Math.min(skip + quizzes.length, total),
      },
    });
  } catch (error) {
    console.error("getAllQuizWebsite error:", error);
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
};

const getQuizById = async (req, res) => {
  try {
    const { quiz_id } = req.params;

    if (!quiz_id) {
      return res.status(400).json({
        status: 400,
        message: "Quiz ID is required",
      });
    }

    const quiz = await Quiz.findById(quiz_id)
      .populate("category_id", "category_name")
      .lean();

    if (!quiz) {
      return res.status(404).json({
        status: 404,
        message: "Quiz not found",
      });
    }

    const sanitizedQuestionGroup = quiz.question_group.map((question) => ({
      ...question,
      options: question.options.map(({ answer, ...rest }) => rest),
    }));

    return res.status(200).json({
      status: 200,
      message: "Quiz fetched successfully (Security Enabled)!",
      data: {
        ...quiz,
        question_group: sanitizedQuestionGroup,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createQuiz,
  deleteQuiz,
  updateQuiz,
  getAllQuiz,
  getAllQuizWebsite,
  getQuizById,
};
