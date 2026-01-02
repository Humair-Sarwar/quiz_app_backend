const {
  addMediaImage,
  getMediaImage,
  deleteMediaImage,
} = require("../controllers/MediaController");
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

router.post("/admin/image", auth, upload.single("image"), addMediaImage);

router.get("/admin/image", auth, getMediaImage);

router.delete("/admin/image/:id", auth, deleteMediaImage);

module.exports = router;
