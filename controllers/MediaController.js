const Media = require('../models/media')
const Joi = require('joi');

const fs = require("fs");
const path = require("path");
const addMediaImage = async (req, res, next) => {
  try {
    const { business_id } = req.body;
    const mediaImage = req.file;

    // ✅ Validate input
    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    if (!mediaImage) {
      return res.status(400).json({
        status: 400,
        message: "No image file uploaded",
      });
    }

    // ✅ Extract image filename (from multer)
    const image = mediaImage.filename;

    // ✅ Save record to MongoDB
    const result = await Media.create({
      business_id,
      image,
    });

    // ✅ Send success response
    return res.status(200).json({
      status: 200,
      message: "Image uploaded successfully!",
      data: result,
    });
  } catch (error) {
    console.error("addMediaImage error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const getMediaImage = async (req, res, next) => {
  // ✅ Validate input
  const schema = Joi.object({
    business_id: Joi.string().required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return next(error);
  }

  const { business_id, page, limit } = value;

  try {
    // ✅ Pagination logic
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ✅ Fetch data & count in parallel
    const [result, total] = await Promise.all([
      Media.find({ business_id })
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Media.countDocuments({ business_id }),
    ]);

    // ✅ If no media found
    if (!result.length) {
      return res.status(404).json({
        status: 404,
        message: "No media found for this business!",
      });
    }

    // ✅ Send success response
    return res.status(200).json({
      status: 200,
      message: "Media images fetched successfully!",
      data: result,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error("getMediaImage error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};


const deleteMediaImage = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Validate id
    if (!id) {
      return res.status(400).json({
        status: 400,
        message: "Media ID is required",
      });
    }

    // ✅ Find media record
    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        status: 404,
        message: "Image not found",
      });
    }

    // ✅ Remove image file from uploads folder
    const imagePath = path.join("uploads", media.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // ✅ Delete record from MongoDB
    await Media.deleteOne({ _id: id });

    return res.status(200).json({
      status: 200,
      message: "Image deleted successfully!",
    });
  } catch (error) {
    console.error("deleteMediaImage error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};


module.exports = {
    addMediaImage,
    getMediaImage,
    deleteMediaImage
}