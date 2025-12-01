const express = require("express");
const router = express.Router();

// Import Sub-routers (แยกไฟล์ตามหน้าที่ เพื่อความเป็นระเบียบ)
const authRouter = require("./auth");
const linksRouter = require("./links");
const adminRouter = require("./admin");

// Middlewares
const { apiLimiter } = require("../middlewares/rateLimit");
const AppError = require("../utils/AppError");

// -------------------------------------------------------------------
// Global API Middleware
// -------------------------------------------------------------------
router.use(apiLimiter);

// -------------------------------------------------------------------
// Mount Sub-routers (เชื่อมต่อเส้นทางย่อย)
// -------------------------------------------------------------------
router.use("/auth", authRouter);
router.use("/links", linksRouter);
router.use("/admin", adminRouter);

// -------------------------------------------------------------------
// 404 Not Found for API
// -------------------------------------------------------------------
// ใช้ Regex /.*/ แทน "*" เพื่อแก้ Error: Missing parameter name at index 1
// สาเหตุ: Express 5 (path-to-regexp) ไม่รองรับ "*" แบบเดี่ยวๆ อีกต่อไป
router.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

module.exports = router;
