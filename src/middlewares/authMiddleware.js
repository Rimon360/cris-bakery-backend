const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(403).json({message: "Access denied"});
  }

  try {
    const decoded = jwt.verify(token, "abc123");
    req.user = decoded; // User information from decoded token
    next();
  } catch (error) {
    return res.status(400).json({message: "Invalid token"});
  }
};
const adminMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({message: "Access Denied"});

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.role === "admin") {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({message: "Only admin can access this route"});
    }
  } catch {
    res.status(403).json({message: "Invalid Token"});
  }
};

const memberMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) return res.status(401).json({message: "Access Denied"});

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.role === "member"|| decoded.role === "admin") {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({message: "Only admin or member can access this route"});
    }
  } catch {
    res.status(403).json({message: "Invalid Token"});
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  memberMiddleware,
};
