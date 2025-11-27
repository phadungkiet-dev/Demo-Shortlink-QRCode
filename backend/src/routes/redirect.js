const express = require("express");
const router = express.Router();
const redirectController = require("../controllers/redirectController");

// -------------------------------------------------------------------
// Redirect Route (เส้นทางสำหรับลิงก์ย่อ)
// -------------------------------------------------------------------

// GET /r/:slug
// หน้าที่: รับค่า 'slug' จาก URL -> ค้นหาปลายทาง -> Redirect ผู้ใช้
// หมายเหตุ: Route นี้ถูก Mount นอก CSRF Protection ใน app.js (เพราะเป็น Public Action)
router.get("/:slug", redirectController.handleRedirect);

module.exports = router;
