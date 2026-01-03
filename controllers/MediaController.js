const Media = require("../models/media");
const Joi = require("joi");
const cloudinary = require("cloudinary").v2;

const addMediaImage = async (req, res, next) => {
  try {
    const { business_id } = req.body;
    const mediaImage = req.file;

    if (!business_id) {
      return res.status(400).json({ status: 400, message: "business_id is required" });
    }

    if (!mediaImage) {
      return res.status(400).json({ status: 400, message: "No image file uploaded" });
    }

    const result = await Media.create({
      business_id,
      image: mediaImage.path,
      public_id: mediaImage.filename,
    });

    return res.status(200).json({
      status: 200,
      message: "Image uploaded successfully!",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const getMediaImage = async (req, res, next) => {
  const schema = Joi.object({
    business_id: Joi.string().required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  });

  const { error, value } = schema.validate(req.query);
  if (error) return next(error);

  const { business_id, page, limit } = value;

  try {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [result, total] = await Promise.all([
      Media.find({ business_id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Media.countDocuments({ business_id }),
    ]);

    const firstRecord = skip + 1;
    const lastRecord = Math.min(skip + result.length, total);

    return res.status(200).json({
      status: 200,
      message: "Media images fetched successfully!",
      data: result,
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
    return res.status(500).json({ status: 500, message: error.message });
  }
};

const deleteMediaImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: 400, message: "Media ID is required" });
    }

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({ status: 404, message: "Image not found" });
    }

    if (media.public_id) {
      await cloudinary.uploader.destroy(media.public_id);
    }

    await Media.deleteOne({ _id: id });

    return res.status(200).json({
      status: 200,
      message: "Image deleted successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

module.exports = { addMediaImage, getMediaImage, deleteMediaImage };