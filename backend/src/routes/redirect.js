const express = require("express");
const router = express.Router();
const redirectController = require("../controllers/redirectController");

// -------------------------------------------------------------------
// Redirect Route (เส้นทางสำหรับลิงก์ย่อ)
// -------------------------------------------------------------------

// GET /:slug
// URL จริงจะเป็น: http://domain.com/{PREFIX}/{SLUG}
// (Prefix ถูกกำหนดตอน Mount ใน app.js เช่น /sl)
// หน้าที่: รับค่า 'slug' -> ค้นหาปลายทาง -> Redirect ผู้ใช้
// หมายเหตุ: Route นี้ถูก Mount นอก CSRF Protection (Public Action)
router.get("/:slug", redirectController.handleRedirect);

module.exports = router;
