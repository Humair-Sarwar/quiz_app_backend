const jwt = require("jsonwebtoken");

const auth = async (req, res, next) => {
  try {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader != "undefined") {
      const token = bearerHeader.split(" ")[1];
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.token = user;
      next();
    } else {
      res.status(401).json({ message: "Token not provided!" });
    }
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired token!" });
  }
};

module.exports = auth;
