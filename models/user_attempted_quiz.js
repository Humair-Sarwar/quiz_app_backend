const mongoose = require("mongoose");

const { Schema } = mongoose;

const OptionSchema = new Schema(
  {
    option_label: { type: String, required: true },
    option_sort_order: { type: Number, default: 1 },
    is_correct: { type: Boolean, default: false },
    answer: { type: Boolean, default: false },
  },
  { _id: false }
);

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
