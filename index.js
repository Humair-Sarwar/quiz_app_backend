const express = require("express");
require("dotenv").config();
const { PORT } = require("./config/index");
const dbConnect = require("./database/index");
const userRoute = require("./routes/userRouter");
const categoryRoute = require("./routes/categoryRouter");
const attemptedQuizRoute = require("./routes/attemptedQuizRouter");
const quizListRoute = require("./routes/quizListRouter");
const mediaRoute = require("./routes/mediaRouter");
const dashboardRoute = require("./routes/dashboardRouter");
const settingsRoute = require("./routes/settingsRouter");

const cors = require("cors");
const errorHandler = require("./middlewares/errorHandler");
const app = express();
app.use(express.json());
app.use(cors());
app.use("/auth", userRoute);
app.use(
  "/api",
  categoryRoute,
  attemptedQuizRoute,
  quizListRoute,
  mediaRoute,
  dashboardRoute,
  settingsRoute
);
app.use("/uploads", express.static("uploads"));
dbConnect();

app.use(errorHandler);
app.listen(PORT, () => {
  console.log(`Backend is running on PORT: ${PORT}`);
});
