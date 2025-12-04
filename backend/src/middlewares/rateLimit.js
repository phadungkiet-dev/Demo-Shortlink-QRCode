const rateLimit = require("express-rate-limit");
const AppError = require("../utils/AppError");
const { RATE_LIMIT } = require("../config/constants");

// เช็ค Environment
const isDev = process.env.NODE_ENV === "development";

// Helper: ส่ง Error แบบ AppError เมื่อเกิน Limit
const limitHandler = (req, res, next, options) => {
  // ส่ง AppError 429 (Too Many Requests)
  next(new AppError(options.message, options.statusCode));
};

/**
 * Limiter สำหรับ "สร้างลิงก์" (Create Link)
 * - คนทั่วไป (Anonymous): จำกัดเข้มงวด ป้องกัน Spam
 * - สมาชิก (Logged in): ไม่จำกัด (Skip)
 */
const createLinkLimiter = rateLimit({
  windowMs: RATE_LIMIT.CREATE.WINDOW_MS, // 1 ชั่วโมง
  // Dev: ให้ 1000 ครั้ง (Test สบาย), Prod: 5 ครั้ง (กัน Spam)
  max: isDev ? RATE_LIMIT.CREATE.MAX_DEV : RATE_LIMIT.CREATE.MAX_PROD,
  message:
    "You have created too many links recently. Please log in for unlimited access.",
  handler: limitHandler,
  standardHeaders: true, // ส่ง Header `RateLimit-*` บอก User
  legacyHeaders: false, // ปิด Header X-RateLimit-* แบบเก่า
  // ถ้า Login แล้ว ให้ข้าม Limiter นี้ไปเลย (Unlimited for Users)
  skip: (req, res) => req.isAuthenticated(),
});

/**
 * Limiter สำหรับ "API ทั่วไป" (General Protection)
 * - ป้องกัน DDoS แบบพื้นฐาน และ Brute Force
 */
const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.GENERAL.WINDOW_MS, // 15 นาที
  // Dev: 5000 ครั้ง, Prod: 200 ครั้ง
  max: isDev ? RATE_LIMIT.GENERAL.MAX_DEV : RATE_LIMIT.GENERAL.MAX_PROD,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

/**
 * Limiter สำหรับ "Redirect Link" (/sl/:slug)
 */
const redirectLimiter = rateLimit({
  windowMs: RATE_LIMIT.REDIRECT.WINDOW_MS,
  max: isDev ? RATE_LIMIT.REDIRECT.MAX_DEV : RATE_LIMIT.REDIRECT.MAX_PROD,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

module.exports = {
  createLinkLimiter,
  apiLimiter,
  redirectLimiter,
};
