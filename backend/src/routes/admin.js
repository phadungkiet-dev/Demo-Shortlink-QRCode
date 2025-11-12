const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAuthenticated, isAdmin } = require("../middlewares/authGuard");

// (สำคัญมาก)
// เราใช้ .use() เพื่อบอกว่า "ทุกๆ Route (เส้นทาง) ในไฟล์นี้"
// "ต้อง" ผ่าน 'ยาม' (Guard) 2 คนนี้ก่อนเสมอ
// 1. isAuthenticated (เช็คว่า login หรือไม่... เพื่อให้มี req.user)
// 2. isAdmin (เช็คว่า req.user.role === 'ADMIN')
router.use(isAuthenticated, isAdmin);

// GET /api/admin/users
// (Path จริงจะเป็น /api/admin/users เพราะไฟล์แม่ (index.js) จะ prefix /admin ให้)
router.get("/users", adminController.getAllUsers);

// +++ (เพิ่มใหม่) PATCH /api/admin/users/:id/status (Block/Unblock) +++
router.patch("/users/:id/status", adminController.updateUserStatus);

// DELETE /api/admin/users/:id
router.delete("/users/:id", adminController.deleteUser);

// (อนาคต เราสามารถเพิ่ม Route สำหรับ Admin ที่นี่ได้อีก)
// POST /api/admin/users/:id/role
// router.post("/users/:id/role", adminController.changeUserRole);

module.exports = router;
