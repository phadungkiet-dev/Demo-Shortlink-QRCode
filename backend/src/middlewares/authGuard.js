const AppError = require("../utils/AppError");

/**
 * Middleware: ตรวจสอบว่า User Login หรือยัง
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // ใช้ AppError แทนการส่ง res.status เอง
  next(new AppError("Unauthorized. Please log in.", 401));
};

/**
 * Middleware: ตรวจสอบว่าเป็น Admin หรือไม่
 */
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === "ADMIN") {
    return next();
  }
  next(new AppError("Forbidden. Admin access required.", 403));
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
