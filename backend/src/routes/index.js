const express = require("express");
const router = express.Router();

const authRouter = require("./auth");
const linksRouter = require("./links");
const adminRouter = require("./admin");
const { apiLimiter } = require("../middlewares/rateLimit");
const AppError = require("../utils/AppError");

// Global API Rate Limit
router.use(apiLimiter);

// Health Check
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is healthy" });
});

// Mount Sub-routers
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
