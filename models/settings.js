const mongoose = require("mongoose");

const promotionalItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
});

const socialLinksSchema = new mongoose.Schema(
  {
    facebook: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    instagram: { type: String, default: "" },
    linkedin: { type: String, default: "" },
  },
  { _id: false }
);

const websiteServicesSchema = new mongoose.Schema(
  {
    website_mode: {
      mode: { type: Number, enum: [1, 2], default: 1 },
    },
  },
  { _id: false }
);

const generalSchema = new mongoose.Schema(
  {
    header_logo: { type: String, default: "" },
    footer_logo: { type: String, default: "" },
    site_title: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: Number, default: null },
    footer_description: { type: String, default: "" },
    show_whatsapp_icon: { type: Boolean, default: false },
    whatsapp_no: { type: Number, default: null },
    promotional_items: [promotionalItemSchema],
  },
  { _id: false }
);

const websiteSettingSchema = new mongoose.Schema(
  {
    business_id: { type: String, required: true, index: true },
    general: generalSchema,
    social_links: [socialLinksSchema],
    website_services: websiteServicesSchema,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "WebsiteSetting",
  websiteSettingSchema,
  "website-settings"
);
