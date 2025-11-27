const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

// Helper: ส่ง Error แบบ AppError เมื่อเกิน Limit
const limitHandler = (req, res, next, options) => {
  next(new AppError(options.message, options.statusCode));
};

// 1. Limiter สำหรับการ "สร้างลิงก์" (เข้มงวดกับคนแปลกหน้า)
const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  max: 5, // อนุญาตแค่ 5 ครั้งสำหรับ Anonymous
  message: "Too many links created from this IP. Please log in for more.",
  handler: limitHandler, // ใช้ Handler ของเรา
  // ถ้า Login แล้ว ให้ข้าม Limiter นี้ไปเลย (Unlimited for Users)
  skip: (req, res) => req.isAuthenticated(),
});

// 2. General API limiter (ป้องกัน DDoS เบื้องต้น)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 200, // 200 Request
  message: "Too many requests from this IP, please try again later.",
  handler: limitHandler,
});

module.exports = {
  createLinkLimiter,
  apiLimiter,
};
