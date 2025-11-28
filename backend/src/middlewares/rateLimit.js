const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");

// เช็ค Environment
const isDev = process.env.NODE_ENV === "development";

// Helper: ส่ง Error แบบ AppError เมื่อเกิน Limit
const limitHandler = (req, res, next, options) => {
  next(new AppError(options.message, options.statusCode));
};

// Limiter สำหรับการ "สร้างลิงก์" (เข้มงวดกับคนแปลกหน้า)
const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
  // Dev: ให้ 1000 ครั้ง (Test สบาย), Prod: 5 ครั้ง (กัน Spam)
  max: isDev ? 1000 : 5,
  message: "Too many links created from this IP. Please log in for more.",
  handler: limitHandler,
  // ถ้า Login แล้ว ให้ข้าม Limiter นี้ไปเลย (Unlimited for Users)
  skip: (req, res) => req.isAuthenticated(),
});

// General API limiter (ป้องกัน DDoS เบื้องต้น)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  // Dev: 5000 ครั้ง, Prod: 200 ครั้ง
  max: isDev ? 5000 : 200, 
  message: "Too many requests from this IP, please try again later.",
  handler: limitHandler,
});
module.exports = {
  createLinkLimiter,
  apiLimiter,
};
