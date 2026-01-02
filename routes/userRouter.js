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

const router = require("express").Router();

const multer = require("multer");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    const newFileName = Date.now() + "_" + file.originalname;
    cb(null, newFileName);
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 3,
  },
});

router.post("/signup", signup);

router.post("/login", login);

router.get("/users", auth, users);

router.get("/get-admin-user", auth, getAdminUser);

router.put("/update-user-admin", auth, updateUserAdmin);

router.get("/get-user-profile", auth, getUserDetails);

router.put(
  "/user/update-profile",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "cover_image", maxCount: 1 },
  ]),
  updateUserProfile
);

module.exports = router;
