const express = require("express");
const router = express.Router();
const linkController = require("../controllers/linkController");
const statsController = require("../controllers/statsController");
const { isAuthenticated } = require("../middlewares/authGuard");
const { createLinkLimiter } = require("../middlewares/rateLimit");

// ===================================================================
// PUBLIC ROUTES (เส้นทางสาธารณะ)
// ===================================================================
router.post("/", createLinkLimiter, linkController.createLink);

// ===================================================================
// SECURITY GATE (โซนพื้นที่ส่วนตัว)
// ===================================================================
router.use(isAuthenticated);

// ===================================================================
// PROTECTED ROUTES (จัดการลิงก์ของฉัน)
// ===================================================================
router.get("/me", linkController.getMyLinks);
router.get("/:id/stats", statsController.getLinkStats);
router.patch("/:id", linkController.updateLink);
router.delete("/:id", linkController.deleteLink);

module.exports = router;
