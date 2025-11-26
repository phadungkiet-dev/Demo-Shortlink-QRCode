const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middlewares/authGuard");


// -------------------------------------------------------------------
// Public Routes (ไม่ต้อง Login ก็เข้าได้)
// -------------------------------------------------------------------

// GET /api/auth/csrf
// Frontend ต้องยิงมาที่นี่ก่อนเสมอ เพื่อขอ Token ไปแปะใน Header ของ POST request
router.get("/csrf", authController.getCsrfToken);

// POST /api/auth/login
// รับ Email/Password เพื่อเข้าสู่ระบบ
router.post("/login", authController.loginLocal);

// POST /api/auth/register
// สมัครสมาชิกใหม่ (และ Auto Login ให้เลย)
router.post("/register", authController.register);

// --- Google OAuth ---
// GET /api/auth/google
// เริ่มต้นกระบวนการ -> Redirect ไปหน้า Google Login
router.get("/google", authController.googleAuth);

// GET /api/auth/google/callback
// Google ส่ง User กลับมาที่นี่ -> ระบบเราสร้าง Session ให้
router.get("/google/callback", authController.googleCallback);

// -------------------------------------------------------------------
// Protected Routes (ต้อง Login ก่อนเท่านั้น)
// -------------------------------------------------------------------
// สังเกตการใช้ 'isAuthenticated' middleware คั่นกลาง

// POST /api/auth/logout
// ออกจากระบบ (ลบ Session)
router.post("/logout", isAuthenticated, authController.logout);

// POST /api/auth/change-password
// เปลี่ยนรหัสผ่าน (ใช้ได้เฉพาะคนที่ Login แบบ Local)
router.post("/change-password", isAuthenticated, authController.changePassword);

// GET /api/auth/me
// ดึงข้อมูล User ปัจจุบัน (Frontend ใช้เช็คว่า Login อยู่ไหม)
router.get("/me", isAuthenticated, authController.getMe);

module.exports = router;
