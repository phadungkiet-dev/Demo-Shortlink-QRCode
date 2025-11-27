const express = require("express");
const router = express.Router();
const linkController = require("../controllers/linkController");
const statsController = require("../controllers/statsController");
const { isAuthenticated } = require("../middlewares/authGuard");
const { createLinkLimiter } = require("../middlewares/rateLimit");

// Public: สร้างลิงก์ (มี Rate Limit สำหรับ Anonymous)
router.post("/", createLinkLimiter, linkController.createLink);

// Protected: จัดการลิงก์ของตัวเอง
router.use(isAuthenticated);

router.get("/me", linkController.getMyLinks);
router.patch("/:id", linkController.updateLink);
router.delete("/:id", linkController.deleteLink);
router.get("/:id/stats", statsController.getLinkStats);

module.exports = router;
