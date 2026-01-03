const {
  addMediaImage,
  getMediaImage,
  deleteMediaImage,
} = require("../controllers/MediaController");
const auth = require("../middlewares/Authentication");
const router = require("express").Router();

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "media_uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 3, // 3MB
  },
});

router.post("/admin/image", auth, upload.single("image"), addMediaImage);
router.get("/admin/image", auth, getMediaImage);
router.delete("/admin/image/:id", auth, deleteMediaImage);

module.exports = router;