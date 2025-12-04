const express = require("express");
const router = express.Router();

// Import Sub-routers
const authRouter = require("./auth");
const linksRouter = require("./links");
const adminRouter = require("./admin");

// Middlewares
const { apiLimiter } = require("../middlewares/rateLimit");
const AppError = require("../utils/AppError");

// -------------------------------------------------------------------
// Global API Middleware
// -------------------------------------------------------------------
// บังคับใช้ Rate Limit กับทุก Request ที่เข้ามาทาง /api/*
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
// ดักจับทุก Request ที่หลุดรอดมาจาก Router ข้างบน (แปลว่าหา Path ไม่เจอใน /api)
// ใช้ Regex /.*/ แทน "*" เพื่อรองรับ Express 5
router.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

module.exports = router;
