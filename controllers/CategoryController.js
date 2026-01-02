const Category = require("../models/category");
const Joi = require("joi");

const createCategory = async (req, res, next) => {
  const { business_id, category_name, slug, sort_order, image } = req.body;

  const categorySchema = Joi.object({
    business_id: Joi.string().required(),
    category_name: Joi.string().required(),
    slug: Joi.string().required(),
    sort_order: Joi.number().required(),
    image: Joi.string().allow("").optional(),
  });
  let { error } = categorySchema.validate(req.body);
  if (error) {
    return next(error);
  }

  try {
    const category = await Category.findOne({ category_name });
    if (category) {
      const error = {
        status: 409,
        message: "Category already exist!",
      };
      return next(error);
    }
    const slugExist = await Category.findOne({ slug });
    if (slugExist) {
      const error = {
        status: 409,
        message: "Slug already exist!",
      };
      return next(error);
    }

    await Category.create({
      business_id,
      category_name,
      slug,
      sort_order,
      image,
    });
    return res
      .status(201)
      .json({ status: 201, message: "Category Successfully Created!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};

const deleteCategory = async (req, res, next) => {
  const deleteSchema = Joi.object({
    business_id: Joi.string().required(),
    id: Joi.string().required(),
  });
  const { error } = deleteSchema.validate(req.body);
  if (error) {
    return next(error);
  }
  const { business_id, id } = req.body;
  try {
    const categoryBusinessId = await Category.findOne({ business_id });
    if (!categoryBusinessId) {
      const error = {
        status: 409,
        message: "Category not exist on this business_id",
      };
      return next(error);
    }
    const categoryId = await Category.findById(id);
    if (!categoryId) {
      const error = {
        status: 409,
        message: "Category not exist on this id",
      };
      return next(error);
    }

    const result = await Category.deleteOne({ business_id, _id: id });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ status: 404, message: "Category not found" });
    }
    return res
      .status(200)
      .json({ status: 200, message: "Category deleted successfully!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};

const updateCategory = async (req, res, next) => {
  const updateCategorySchema = Joi.object({
    id: Joi.string().required(),
    business_id: Joi.string().required(),
    image: Joi.string().allow("").optional(),
    category_name: Joi.string().required(),
    slug: Joi.string().required(),
    sort_order: Joi.number().required(),
  });
  const { error } = updateCategorySchema.validate(req.body);
  if (error) {
    return next(error);
  }
  const { business_id, id, image, category_name, slug, sort_order } = req.body;

  try {
    const category = await Category.findOne({ business_id, _id: id });
    if (!category) {
      const error = {
        status: 409,
        message: "Category not exist!",
      };
      return next(error);
    }

    await Category.updateOne(
      { business_id, _id: id },
      { category_name, slug, sort_order, image }
    );
    return res
      .status(200)
      .json({ status: 200, message: "Category Successfully Updated!" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error!", error });
  }
};

const getAllCategories = async (req, res, next) => {
  const getAllCategoriesSchema = Joi.object({
    business_id: Joi.string().required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(10000).default(5),
    search: Joi.string().allow("").optional(),
  });

  const { error, value } = getAllCategoriesSchema.validate({
    ...req.query,
    ...req.body,
  });

  if (error) {
    return next(error);
  }

  const { business_id, page, limit, search } = value;

  try {
    const skip = (page - 1) * limit;

    // 🔍 Build query
    const query = { business_id };

    if (search?.trim()) {
      query.$or = [
        { category_name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    // 🚀 Fetch data & count
    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ sort_order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
    ]);

    // 📊 Record range
    const firstRecord = total === 0 ? 0 : skip + 1;
    const lastRecord = Math.min(skip + categories.length, total);

    return res.status(200).json({
      status: 200,
      message: "Categories fetched successfully!",
      data: categories,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
        firstRecord,
        lastRecord,
      },
    });
  } catch (error) {
    console.error("getAllCategories error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const deleteSelectedCategory = async (req, res, next) => {
  try {
    const categories = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res
        .status(400)
        .json({ status: 400, message: "No categories provided for deletion" });
    }

    // ✅ Validate all input objects
    for (const item of categories) {
      if (!item.id || !item.business_id) {
        return res.status(400).json({
          status: 400,
          message: "Each category must include id and business_id",
        });
      }
    }

    // ✅ Build conditions for bulk deletion
    const deleteConditions = categories.map((item) => ({
      _id: item.id,
      business_id: item.business_id,
    }));

    // ✅ Check if these categories actually exist
    const existingCategories = await Category.find({
      $or: deleteConditions,
    });

    if (existingCategories.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No matching categories found for deletion",
      });
    }

    // ✅ Delete all at once
    const result = await Category.deleteMany({
      $or: deleteConditions,
    });

    return res.status(200).json({
      status: 200,
      message: "Categories deleted successfully!",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({
      message: "Internal Server Error!",
      error: error.message,
    });
  }
};

const getAllCategoriesWebsite = async (req, res, next) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    // 🔍 Build search query
    const query = {};
    if (search.trim()) {
      query.$or = [
        { category_name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    // 🔢 Pagination logic
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    // 🚀 Fetch data and total count in parallel
    const [categories, total] = await Promise.all([
      Category.find(query)
        .sort({ sort_order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Category.countDocuments(query),
    ]);

    // 📊 Calculate record range
    const firstRecord = total === 0 ? 0 : skip + 1;
    const lastRecord = Math.min(skip + categories.length, total);

    // ✅ Success response
    return res.status(200).json({
      status: 200,
      message: "Categories fetched successfully!",
      data: categories,
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
    console.error("getAllCategoriesWebsite error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  createCategory,
  deleteCategory,
  updateCategory,
  getAllCategories,
  deleteSelectedCategory,
  getAllCategoriesWebsite,
};
