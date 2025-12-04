const express = require("express");
const router = express.Router();
const linkController = require("../controllers/linkController");
const statsController = require("../controllers/statsController");
const { isAuthenticated } = require("../middlewares/authGuard");
const { createLinkLimiter } = require("../middlewares/rateLimit");

// ===================================================================
// PUBLIC ROUTES (สร้างลิงก์ได้ทั้งแบบ Anonymous และ Member)
// ===================================================================
// ใช้ createLinkLimiter เพื่อจำกัดจำนวนการสร้าง (Member จะไม่โดนจำกัด)
router.post("/", createLinkLimiter, linkController.createLink);

// ===================================================================
// SECURITY GATE (Authentication Required)
// ===================================================================
// บังคับ Login ตั้งแต่บรรทัดนี้เป็นต้นไป
router.use(isAuthenticated);

// ===================================================================
// PROTECTED ROUTES (จัดการลิงก์ส่วนตัว)
// ===================================================================
router.get("/me", linkController.getMyLinks);
router.get("/:id/stats", statsController.getLinkStats);
router.patch("/:id", linkController.updateLink);
router.delete("/:id", linkController.deleteLink);

module.exports = router;
