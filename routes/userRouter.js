const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const {
  signup,
  users,
  login,
  getAdminUser,
  updateUserAdmin,
  getUserDetails,
  updateUserProfile,
} = require("../controllers/UserController");
const auth = require("../middlewares/Authentication");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_profiles",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 3 },
});

router.post("/signup", signup);
router.post("/login", login);
router.get("/users", auth, users);
router.get("/get-admin-user", auth, getAdminUser);
router.put("/update-user-admin", auth, updateUserAdmin);
router.get("/get-user-profile", auth, getUserDetails);

router.put(
  "/user/update-profile",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "cover_image", maxCount: 1 },
  ]),
  updateUserProfile
);

module.exports = router;