const express = require("express");
const router = express.Router();

// Import Sub-Routers (เส้นทางย่อย)
const authRouter = require("./auth");
const linksRouter = require("./links");
const adminRouter = require("./admin");

const logger = require("../utils/logger");
const { apiLimiter } = require("../middlewares/rateLimit");

// -------------------------------------------------------------------
// Global Middleware
// -------------------------------------------------------------------
// บังคับใช้ Rate Limit กับทุก API ภายใต้ Router นี้
// (ใครยิง API รัวๆ เกิน 100 ครั้ง/15 นาที จะโดนบล็อกชั่วคราว)
router.use(apiLimiter);

// -------------------------------------------------------------------
// Health Check Endpoint
// -------------------------------------------------------------------
// เอาไว้ให้ระบบ Monitoring ยิงเช็คว่า Server ยังทำงานอยู่ไหม
// GET /api/health
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy.",
    timestamp: new Date().toISOString(),
    timezone: process.env.TZ,
  });
});

// -------------------------------------------------------------------
// Mount Sub-Routers
// -------------------------------------------------------------------
// เชื่อมต่อเส้นทางย่อยเข้ากับเส้นทางหลัก

// เส้นทางเกี่ยวกับ User & Auth -> /api/auth/...
router.use("/auth", authRouter);

// เส้นทางเกี่ยวกับ Shortlink -> /api/links/...
router.use("/links", linksRouter);

// เส้นทางสำหรับ Admin -> /api/admin/...
router.use("/admin", adminRouter);

// -------------------------------------------------------------------
// Fallback for Unknown API Routes
// -------------------------------------------------------------------
// ถ้า Request หลุดมาถึงตรงนี้ แปลว่าไม่ตรงกับ Route ไหนเลยข้างบน
// ให้ตอบกลับเป็น JSON 404 (เพื่อให้ Frontend รู้ว่ายิง API ผิด)
router.use((req, res) => {
  res.status(404).json({ message: "API endpoint not found." });
});

module.exports = router;
