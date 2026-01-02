const mongoose = require("mongoose");

const OptionSchema = new mongoose.Schema(
  {
    option_label: { type: String, required: true },
    option_sort_order: { type: Number, default: 1 },
    answer: { type: Boolean, default: false },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    question_title: { type: String, required: true },
    question_sort_order: { type: Number, default: 1 },
    question_type: { type: Number, required: true },
    question_time: { type: String, default: "" },
    options: [OptionSchema],
  },
  { _id: false }
);

const QuizSchema = new mongoose.Schema(
  {
    quiz_title: { type: String, required: true },
    quiz_sort_order: { type: Number, default: 1 },
    quiz_time: { type: String, default: "" },
    business_id: {
      type: String,
      required: true,
      index: true,
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: Boolean,
      required: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    question_group: [QuestionSchema],
  },
  { timestamps: true }
);

const QuizList = mongoose.model("QuizList", QuizSchema, "quiz-list");

module.exports = QuizList;
