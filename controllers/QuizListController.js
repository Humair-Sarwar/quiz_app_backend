const Quiz = require('../models/quiz_list');
const Category = require('../models/category')
const Joi = require("joi");


const createQuiz = async (req, res, next) => {
  // ✅ 1. Define Joi validation schema
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
    category_id: Joi.string().required(), // Category ObjectId as string
    question_group: Joi.array().items(questionSchema).min(1).required(),
    business_id: Joi.string().required(),
    image: Joi.string().optional(),
    status: Joi.boolean().required()
  });

  // ✅ 2. Validate request body
  const { error, value } = quizSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      status: 400,
      message: "Validation error",
      errors: error.details.map((d) => d.message),
    });
  }

  // ✅ 3. Save to MongoDB
  try {
    const quiz = new Quiz(value);
    await quiz.save();

    return res.status(201).json({
      status: 201,
      message: "Quiz created successfully!"
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


const deleteQuiz = async (req, res, next)=>{
    const deleteQuizSchema = Joi.object({
        id: Joi.string().required(),
        business_id: Joi.string().required()
    })
    const {error, value} = deleteQuizSchema.validate({...req.body});

    if(error){
        return next(error);
    }
    try {
        const quiz = await Quiz.findOne({_id: value.id})
        if(!quiz){
            return res.status(404).json({status: 409, message: 'Quiz not found!'});
        }
        const businessId = await Quiz.findOne({business_id: value.business_id})
        if(!businessId){
            return res.status(404).json({status: 409, message: 'Quiz not found!'});
        }
        const result = await Quiz.deleteOne({business_id: value.business_id, _id: value.id});
        return res.status(200).json({status: 200, message: 'Quiz deleted successfully!'});
    } catch (error) {
        return res.status(500).json({message: 'Internal server error!', error});
    }

}

const updateQuiz = async (req, res, next) => {
  // ✅ 1. Validate incoming data
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
    business_id: Joi.string().required(),
    quiz_title: Joi.string().optional(),
    quiz_sort_order: Joi.number().optional(),
    quiz_time: Joi.string().optional(),
    image: Joi.string().optional(),
    category_id: Joi.string().optional(),
    question_group: Joi.array().items(questionSchema).optional(),
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
  const { id } = req.params; // quiz ID from URL

  try {
    // ✅ 2. Find quiz by business and ID
    const quiz = await Quiz.findOne({ _id: id, business_id });

    if (!quiz) {
      return res.status(404).json({
        status: 404,
        message: "Quiz not found for this business_id and id",
      });
    }

    // ✅ 3. Update the quiz
    Object.assign(quiz, value); // merges all updated fields
    await quiz.save();

    return res.status(200).json({
      status: 200,
      message: "Quiz updated successfully!"
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
    const { business_id, category_id, search = "", page = 1, limit = 10 } =
      req.query.business_id ? req.query : req.body;

    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    const query = { business_id };
    if (category_id) query.category_id = category_id;
    if (search.trim()) query.quiz_title = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [data, total] = await Promise.all([
      Quiz.find(query)
        // 👇 removed select(), so full object comes
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Quiz.countDocuments(query),
    ]);

    return res.status(200).json({
      status: 200,
      message: "Quiz list fetched successfully!",
      data,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: parseInt(page),
        limit: limitNum,
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
      limit = 10 
    } = req.query;

    // 🧠 Validate category_slug
    if (!category_slug) {
      return res.status(400).json({
        status: 400,
        message: "category_slug is required",
      });
    }

    // 🗂️ Find category by slug
    const category = await Category.findOne({ slug: category_slug }).lean();
    console.log("Found category:", category);
    if (!category) {
      return res.status(404).json({
        status: 404,
        message: "Category not found!",
      });
    }

    // 🔍 Build quiz query
    const query = { category_id: category._id };
    if (search.trim()) {
      query.quiz_title = { $regex: search, $options: "i" };
    }

    // 🔢 Pagination logic
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    // 🚀 Fetch paginated data and total count in parallel
    const [quizzes, total] = await Promise.all([
      Quiz.find(query)
        .sort({ quiz_sort_order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Quiz.countDocuments(query),
    ]);

    // 📊 Calculate record range
    const firstRecord = total === 0 ? 0 : skip + 1;
    const lastRecord = Math.min(skip + quizzes.length, total);

    // 🧩 Format quiz data
    const formatted = quizzes.map(q => ({
      _id: q._id,
      quiz_title: q.quiz_title,
      quiz_time: q.quiz_time,
      image: q.image,
      business_id: q.business_id,
      category_id: q.category_id,
      total_questions: q.question_group?.length || 0,
      createdAt: q.createdAt,
    }));

    // ✅ Send success response
    return res.status(200).json({
      status: 200,
      message: "Quiz list fetched successfully!",
      data: formatted,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        limit: limitNum,
        firstRecord,
        lastRecord,
      },
    });

  } catch (error) {
    console.error("getAllQuizWebsite error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};







module.exports = {
    createQuiz,
    deleteQuiz,
    updateQuiz,
    getAllQuiz,
    getAllQuizWebsite
}