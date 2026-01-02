const Joi = require("joi");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Media = require("../models/media");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const signup = async (req, res, next) => {
  const signupSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    confirmPassword: Joi.ref("password"),
    type: Joi.number().optional(),
  });

  const { error } = signupSchema.validate(req.body);
  if (error) {
    return next(error);
  }

  const { email, password, name, type } = req.body;

  try {
    const emailInUse = await User.exists({ email });
    if (emailInUse) {
      const error = {
        status: 409,
        message: "Email already exist!",
      };
      return next(error);
    }
  } catch (error) {
    return next(error);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  let signupUser;

  try {
    const data = {
      name,
      email,
      password: passwordHash,
      type: type ? type : 1,
    };
    signupUser = await User.create(data);
  } catch (error) {
    return next(error);
  }

  return res
    .status(201)
    .json({ message: "User Created Successfully!", status: 200 });
};

const users = async (req, res) => {
  try {
    const {
      type = 2,
      search = "",
      page = 1,
      limit = 10,
    } = req.query.type ? req.query : req.body;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const matchQuery = { type: parseInt(type) };
    if (search.trim()) {
      matchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const aggregatePipeline = [
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $lookup: {
          from: "user_attempted_quiz",
          let: { userIdStr: { $toString: "$_id" } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$user_id", "$$userIdStr"] },
              },
            },
            { $sort: { createdAt: -1 } },
          ],
          as: "attempted_quizzes",
        },
      },
      {
        $project: {
          password: 0,
          __v: 0,
        },
      },
    ];

    const [usersList, total] = await Promise.all([
      User.aggregate(aggregatePipeline),
      User.countDocuments(matchQuery),
    ]);

    if (!usersList || usersList.length === 0) {
      return res.status(404).json({ status: 404, message: "No users found" });
    }

    const totalPages = Math.ceil(total / limitNum);
    const firstRecord = total === 0 ? 0 : skip + 1;
    const lastRecord = Math.min(skip + usersList.length, total);

    return res.status(200).json({
      status: 200,
      message: "Data fetched successfully!",
      data: usersList,
      pagination: {
        totalItems: total,
        totalPages: totalPages,
        currentPage: pageNum,
        limit: limitNum,
        firstRecord: firstRecord,
        lastRecord: lastRecord,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: 500, message: error.message });
  }
};

const login = async (req, res, next) => {
  const loginSchema = Joi.object({
    email: Joi.string().min(3).max(30).required(),
    password: Joi.string().required(),
  });
  let { error } = loginSchema.validate(req.body);
  if (error) {
    return next(error);
  }
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "Email no exist!", success: false });
    }
    const passwordExist = await bcrypt.compare(password, user.password);
    if (!passwordExist) {
      return res
        .status(404)
        .json({ message: "Password does not match!", success: false });
    }
    const token = jwt.sign(
      { userId: user.id, useremail: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    res.status(200).json({
      message: "User login successfully!",
      success: true,
      auth: true,
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!", success: false });
  }
};

const getAdminUser = async (req, res, next) => {
  const getAdminUserSchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.number().required().default(2),
  });
  const { error } = getAdminUserSchema.validate(req.query);
  if (error) {
    return next(error);
  }
  const { id, type } = req.query;
  try {
    const result = await User.findOne({ _id: id, type });
    if (!result) {
      const error = {
        status: 404,
        message: "User not found!",
      };
      return next(error);
    }
    return res
      .status(200)
      .json({ status: 200, message: "User successfully get!", data: result });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
  }
};

const updateUserAdmin = async (req, res, next) => {
  const updateUserAdmin = Joi.object({
    image: Joi.string().allow("").optional(),
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    id: Joi.string().required(),
  });
  const { error } = updateUserAdmin.validate(req.body);
  if (error) {
    return next(error);
  }
  const { image, name, email, id } = req.body;
  try {
    const result = await User.updateOne({ _id: id }, { image, name, email });
    return res
      .status(200)
      .json({ status: 200, message: "User successfully updated!" });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error!" });
  }
};

const getUserDetails = async (req, res, next) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required",
      });
    }

    const user = await User.findById(user_id)
      .select(
        "name email type image cover_image phone country createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        status: 404,
        message: "User not found!",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "User details fetched successfully!",
      data: user,
    });
  } catch (error) {
    console.error("getUserDetails error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { user_id, name, email, phone, country } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required",
      });
    }

    const image = req.files?.image ? req.files.image[0].filename : null;
    const cover_image = req.files?.cover_image
      ? req.files.cover_image[0].filename
      : null;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;
    if (image) updateData.image = image;
    if (cover_image) updateData.cover_image = cover_image;

    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      { $set: updateData },
      { new: true, select: "-password" }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        status: 404,
        message: "User not found!",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Profile updated successfully!",
      data: updatedUser,
    });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  users,
  login,
  getAdminUser,
  updateUserAdmin,
  getUserDetails,
  updateUserProfile,
};
