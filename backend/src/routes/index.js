const express = require("express");
const router = express.Router();
const authRouter = require("./auth");
const linksRouter = require("./links");
const adminRouter = require("./admin"); // (เพิ่มใหม่) 1. Import

const logger = require("../utils/logger");
const { apiLimiter } = require("../middlewares/rateLimit");

// General API Rate Limiter
router.use(apiLimiter);

// Health Check
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy.",
    timestamp: new Date().toISOString(),
    timezone: process.env.TZ,
  });
});

// Mount other routers
router.use("/auth", authRouter);
router.use("/links", linksRouter);
router.use("/admin", adminRouter); // (เพิ่มใหม่) 2. ติดตั้ง (Mount)

// Fallback for unknown API routes
router.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

module.exports = router;
