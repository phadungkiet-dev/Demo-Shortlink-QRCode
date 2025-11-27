const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAuthenticated, isAdmin } = require("../middlewares/authGuard");

// -------------------------------------------------------------------
// Security Gate (ด่านตรวจความปลอดภัย)
// -------------------------------------------------------------------
// สำคัญมาก! บรรทัดนี้จะ "บังคับ" ให้ทุก Route ด้านล่าง
// ต้องผ่านการตรวจสอบ 2 ชั้นเสมอ:
//  1. isAuthenticated: ต้อง Login แล้วเท่านั้น (ถ้าไม่ -> 401)
//  2. isAdmin: ต้องมี Role เป็น 'ADMIN' เท่านั้น (ถ้าไม่ -> 403)
router.use(isAuthenticated, isAdmin);

// -------------------------------------------------------------------
// Admin Routes
// -------------------------------------------------------------------

// GET /api/admin/users
// ดึงรายชื่อ User ทั้งหมด (เพื่อแสดงในตารางจัดการ)
router.get("/users", adminController.getAllUsers);

// PATCH /api/admin/users/:id/status
// เปลี่ยนสถานะ User (Block/Unblock)
// ใช้ PATCH เพราะเราแก้แค่ field เดียว (isBlocked) ไม่ได้แก้ทั้งหมด
router.patch("/users/:id/status", adminController.updateUserStatus);

// DELETE /api/admin/users/:id
// ลบ User ถาวร (ระวัง! ข้อมูล Links ของเขาจะหายไปด้วยเพราะ Cascade Delete)
router.delete("/users/:id", adminController.deleteUser);

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", adminController.changeUserRole);

router.patch("/users/:id/limit", adminController.updateUserLimit);

router.get("/users/:id/links", adminController.getUserLinks);

module.exports = router;
