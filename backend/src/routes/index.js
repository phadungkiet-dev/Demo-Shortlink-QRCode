const express = require("express");
const router = express.Router();

// Import Sub-routers
const authRouter = require("./auth");
const linksRouter = require("./links");
const adminRouter = require("./admin");

// Middlewares
const { apiLimiter } = require("../middlewares/rateLimit");
const AppError = require("../utils/AppError");

// [---------- Global API Middleware ----------]
// บังคับใช้ Rate Limit กับทุก Request ที่เข้ามาทาง /api/*
router.use(apiLimiter);

// [---------- Mount Sub-routers (เชื่อมต่อเส้นทางย่อย) ----------]
// /api/auth -> จัดการ Login/Register (Public & Protected)
router.use("/auth", authRouter);
// /api/links -> จัดการลิงก์ (Protected: ต้องใส่ authGuard ไว้ข้างในไฟล์ links.js)
router.use("/links", linksRouter);
// /api/admin -> จัดการระบบ (Protected + Admin: ต้องใส่ authGuard + adminGuard ไว้ข้างใน)
router.use("/admin", adminRouter);

// [---------- 404 Not Found for API ----------]
// ดักจับทุก Request ที่หลุดรอดมาจาก Router ข้างบน
router.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

module.exports = router;
