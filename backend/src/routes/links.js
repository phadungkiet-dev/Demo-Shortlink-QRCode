const express = require("express");
const passport = require("passport");
const router = express.Router();
const linkController = require("../controllers/linkController");
const statsController = require("../controllers/statsController");
const { authGuard } = require("../middlewares/authGuard");
const { createLinkLimiter } = require("../middlewares/rateLimit");

// [---------- Middleware: Optional Authentication ----------]
// สำหรับ Route ที่เข้าได้ทั้ง Anonymous และ Member (เช่น สร้างลิงก์)
// ถ้ามี Token ถูกต้อง -> แนบ req.user (เป็น Member Link)
// ถ้าไม่มี/Token ผิด -> ปล่อยผ่าน (เป็น Anonymous Link)
const optionalAuth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (user) {
      req.user = user;
    }
    // ไม่ว่าผลจะเป็นยังไง ก็ให้ไปต่อได้ (ไม่ throw 401)
    next();
  })(req, res, next);
};

// [---------- PUBLIC ROUTES (สร้างลิงก์ได้ทั้งแบบ Anonymous และ Member) ----------]
// ใช้ createLinkLimiter เพื่อจำกัดจำนวนการสร้าง (Member จะไม่โดนจำกัดใน Controller)
// ใส่ optionalAuth เพื่อเช็คว่าเป็น Member หรือไม่
router.post("/", createLinkLimiter, optionalAuth, linkController.createLink);

// [---------- SECURITY GATE (Authentication Required) ----------]
// บังคับว่าต้องมี Access Token ที่ถูกต้อง ตั้งแต่บรรทัดนี้เป็นต้นไป
router.use(authGuard);

// [---------- PROTECTED ROUTES (จัดการลิงก์ส่วนตัว) ----------]
router.get("/me", linkController.getMyLinks);
router.get("/:id/stats", statsController.getLinkStats);
router.patch("/:id", linkController.updateLink);
router.delete("/:id", linkController.deleteLink);

module.exports = router;
