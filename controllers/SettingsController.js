const WebsiteSetting = require("../models/settings");

const generalSettings = async (req, res, next) => {
  try {
    const { business_id, general } = req.body;

    // ✅ Basic validation
    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    if (!general || typeof general !== "object") {
      return res.status(400).json({
        status: 400,
        message: "general object is required",
      });
    }

    // ✅ Upsert logic (update if exists, create if not)
    const updatedSetting = await WebsiteSetting.findOneAndUpdate(
      { business_id },
      { $set: { general } },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      status: 200,
      message: "General settings saved successfully!",
      data: updatedSetting.general,
    });
  } catch (error) {
    console.error("updateGeneralSettings error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message,
    });
  }
};









const getGeneralSettings = async (req, res) => {
  try {
    const { business_id } = req.query;

    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    const setting = await WebsiteSetting.findOne(
      { business_id },
      { general: 1, _id: 0 }
    ).lean();

    // ✅ SAFE RETURN
    return res.status(200).json({
      status: 200,
      message: "General settings fetched successfully!",
      data: setting?.general ?? null,
    });

  } catch (error) {
    console.error("getGeneralSettings error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};










const createOrUpdateSocialLinks = async (req, res, next) => {
  try {
    const { business_id, social_links } = req.body;

    // 🧩 Validate input
    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    if (!social_links || !Array.isArray(social_links)) {
      return res.status(400).json({
        status: 400,
        message: "social_links must be an array of objects",
      });
    }

    // 🔄 Upsert (create if not exists, update if exists)
    const updated = await WebsiteSetting.findOneAndUpdate(
      { business_id },
      { $set: { social_links } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      status: 200,
      message: "Social links saved successfully!",
      data: updated.social_links,
    });
  } catch (error) {
    console.error("createOrUpdateSocialLinks error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};



const getSocialLinks = async (req, res, next) => {
  try {
    const { business_id } = req.query;

    // 🧩 Validate business_id
    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    // 🔍 Fetch only the social_links field
    const setting = await WebsiteSetting.findOne(
      { business_id },
      { social_links: 1, _id: 0 }
    ).lean();

    // ⚠️ Handle no data
    if (!setting || !setting.social_links) {
      return res.status(404).json({
        status: 404,
        message: "No social links found for this business!",
      });
    }

    // ✅ Success response
    return res.status(200).json({
      status: 200,
      message: "Social links fetched successfully!",
      data: setting.social_links,
    });
  } catch (error) {
    console.error("getSocialLinks error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal server error!",
      error: error.message,
    });
  }
};

const createOrUpdateWebsiteServices = async (req, res, next) => {
  try {
    const { business_id, website_services } = req.body;

    // 🧩 Validate required fields
    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    if (!website_services || typeof website_services !== "object") {
      return res.status(400).json({
        status: 400,
        message: "website_services must be an object",
      });
    }

    // 🔄 Upsert (create new or update existing)
    const updated = await WebsiteSetting.findOneAndUpdate(
      { business_id },
      { $set: { website_services } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      status: 200,
      message: "Website services saved successfully!",
      data: updated.website_services,
    });
  } catch (error) {
    console.error("createOrUpdateWebsiteServices error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getWebsiteServices = async (req, res, next) => {
  try {
    const { business_id } = req.query;

    // 🧩 Validate input
    if (!business_id) {
      return res.status(400).json({
        status: 400,
        message: "business_id is required",
      });
    }

    // 🔍 Fetch data
    const setting = await WebsiteSetting.findOne({ business_id })
      .select("website_services -_id")
      .lean();

    // if (!setting || !setting.website_services) {
    //   return res.status(404).json({
    //     status: 404,
    //     message: "No website services found for this business_id!",
    //   });
    // }

    // ✅ Success response
    return res.status(200).json({
      status: 200,
      message: "Website services fetched successfully!",
      data: setting?.website_services || [],
    });
  } catch (error) {
    console.error("getWebsiteServices error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};









const getWebsiteData = async (req, res, next) => {
  try {
    // 🧩 Fetch the first available website settings record
    const setting = await WebsiteSetting.findOne().lean();

    if (!setting) {
      return res.status(404).json({
        status: 404,
        message: "Website data not found!",
      });
    }

    // ✅ Prepare response (safe optional chaining)
    const response = {
      header_logo: setting?.general?.header_logo || "",
      footer_logo: setting?.general?.footer_logo || "",
      site_title: setting?.general?.site_title || "",
      email: setting?.general?.email || "",
      phone: setting?.general?.phone || "",
      footer_description: setting?.general?.footer_description || "",
      show_whatsapp_icon: setting?.general?.show_whatsapp_icon || false,
      whatsapp_no: setting?.general?.whatsapp_no || "",
      promotional_items: setting?.general?.promotional_items || [],
      social_links: setting?.social_links?.[0] || {
        facebook: "",
        instagram: "",
        tiktok: "",
        whatsapp: "",
      },
      website_mode: setting?.website_services?.website_mode?.mode || 1,
    };

    // 🚀 Send formatted success response
    return res.status(200).json({
      status: 200,
      message: "Website data fetched successfully!",
      data: response,
    });
  } catch (error) {
    console.error("getWebsiteData error:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


module.exports = {
    generalSettings,
    getGeneralSettings,
    createOrUpdateSocialLinks,
    getSocialLinks,
    createOrUpdateWebsiteServices,
    getWebsiteServices,
    getWebsiteData
}