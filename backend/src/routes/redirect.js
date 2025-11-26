const express = require("express");
const router = express.Router();
const redirectController = require("../controllers/redirectController");

// -------------------------------------------------------------------
// Redirect Route (เส้นทางสำหรับลิงก์ย่อ)
// -------------------------------------------------------------------

// GET /r/:slug
// รับค่า 'slug' จาก URL แล้วส่งให้ Controller จัดการ
//
// *ข้อสังเกตสำคัญ:*
// Route นี้ถูก Mount ไว้ใน app.js *ก่อน* Middleware ป้องกัน CSRF
// เพราะการ Redirect เป็น Public Action ที่ไม่ต้องใช้ Token ความปลอดภัย
// (ใครๆ ก็คลิกลิงก์ได้)
router.get("/:slug", redirectController.handleRedirect);

module.exports = router;
