const express = require("express");
const router = express.Router();
const linkController = require("../controllers/linkController");
const statsController = require("../controllers/statsController");

// Import Middleware
const { isAuthenticated } = require("../middlewares/authGuard");
const { createLinkLimiter } = require("../middlewares/rateLimit");

// -------------------------------------------------------------------
// Create Shortlink (สร้างลิงก์)
// -------------------------------------------------------------------
// POST /api/links
// ความพิเศษ: Route นี้ "เปิด Public" เพื่อให้คนทั่วไปสร้างลิงก์ได้
// แต่มี 'createLinkLimiter' คอยคุมกำเนิด spam สำหรับคนไม่ได้ Login
// (ส่วนคน Login แล้ว Limiter จะยอมปล่อยผ่านให้สร้างได้ปกติ)
router.post("/", createLinkLimiter, linkController.createLink);

// -------------------------------------------------------------------
// Manage My Links (จัดการลิงก์ของฉัน)
// -------------------------------------------------------------------
// ตั้งแต่ตรงนี้ไป ต้อง Login เท่านั้น (isAuthenticated)

// GET /api/links/me
// ดูรายการลิงก์ทั้งหมดของฉัน
router.get("/me", isAuthenticated, linkController.getMyLinks);

// PATCH /api/links/:id
// แก้ไขลิงก์ (เช่น ต่ออายุ, เปลี่ยน URL ปลายทาง, อัปเดต QR)
router.patch("/:id", isAuthenticated, linkController.updateLink);

// DELETE /api/links/:id
// ลบลิงก์ (หายถาวร)
router.delete("/:id", isAuthenticated, linkController.deleteLink);

// -------------------------------------------------------------------
// Link Statistics (ดูสถิติ)
// -------------------------------------------------------------------
// GET /api/links/:id/stats
// ดูยอดวิว, กราฟ, แหล่งที่มา (ต้องเป็นเจ้าของลิงก์ถึงดูได้)
router.get("/:id/stats", isAuthenticated, statsController.getLinkStats);

module.exports = router;
