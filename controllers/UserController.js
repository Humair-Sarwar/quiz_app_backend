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
  // password hash
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

  return res.status(201).json({ message: "User Created Successfully!", status: 200 });
};

const users = async (req, res) => {
  try {
    // Extract query params (support both body and query)
    const {
      type = 1,
      search = "",
      page = 1,
      limit = 10,
    } = req.query.type ? req.query : req.body;

    // Build query object dynamically
    const query = {};
    if (type) query.type = type;
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // case-insensitive search
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Fetch users with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 }) // newest first
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    if (!users || users.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No users found",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Users fetched successfully!",
      data: users,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: parseInt(page),
        limit: limitNum,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
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
  const { error } = getAdminUserSchema.validate(req.body);
  if (error) {
    return next(error);
  }
  const { id, type } = req.body;
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
    image: Joi.string().optional(),
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
    const { user_id } = req.body;

    // 🧠 Validate
    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required",
      });
    }

    // 🔍 Find user (excluding password)
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

    // ✅ Success
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

    // 🧠 Validate required field
    if (!user_id) {
      return res.status(400).json({
        status: 400,
        message: "user_id is required",
      });
    }

    // 🖼️ Handle uploaded images (if any)
    const image = req.files?.image ? req.files.image[0].filename : null;
    const cover_image = req.files?.cover_image
      ? req.files.cover_image[0].filename
      : null;

    // 🧩 Build update object dynamically
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (country) updateData.country = country;
    if (image) updateData.image = image;
    if (cover_image) updateData.cover_image = cover_image;

    // ⚡ Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      user_id,
      { $set: updateData },
      { new: true, select: "-password" } // exclude password
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({
        status: 404,
        message: "User not found!",
      });
    }

    // ✅ Success response
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
