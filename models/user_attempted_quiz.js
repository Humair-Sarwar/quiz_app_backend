const mongoose = require("mongoose");

const { Schema } = mongoose;

// Option schema (for each question)
const OptionSchema = new Schema(
  {
    option_label: { type: String, required: true },
    option_sort_order: { type: Number, default: 1 },
    answer: { type: Boolean, default: false }, // whether user marked as correct
  },
  { _id: false }
);

// Question schema
const QuestionSchema = new Schema(
  {
    question_title: { type: String, required: true },
    question_sort_order: { type: Number, default: 1 },
    question_type: { type: Number, required: true },
    question_time: { type: String, default: "" },
    options: [OptionSchema],
  },
  { _id: false }
);

// Main User Attempted Quiz schema
const UserAttemptedQuizSchema = new Schema(
  {
    user_id: { type: String, required: true },
    quiz_id: { type: String, required: true },
    quiz_title: { type: String, required: true },
    quiz_sort_order: { type: Number, default: 1 },
    quiz_time: { type: String, default: "" },
    question_group: [QuestionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "UserAttemptedQuiz",
  UserAttemptedQuizSchema,
  "user_attempted_quiz"
);
