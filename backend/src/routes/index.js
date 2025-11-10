const express = require("express");
const router = express.Router();
const authRouter = require("./auth");
const linksRouter = require("./links");
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

// Fallback for unknown API routes
router.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

module.exports = router;
