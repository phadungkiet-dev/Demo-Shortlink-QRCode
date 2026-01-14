const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authGuard } = require("../middlewares/authGuard");

// [---------- PUBLIC ROUTES (Anyone can access) ----------]
// Login & Register
router.post("/login", authController.loginLocal);
router.post("/register", authController.register);

// Refresh Token (Access Token ใหม่จาก Cookie)
// ต้องเป็น Public เพราะตอนเรียกใช้ Access Token เดิมอาจจะหมดอายุไปแล้ว
router.post("/refresh-token", authController.refreshToken);

// Password Recovery Routes
router.post("/forgot-password", authController.forgotPassword);
router.get("/reset-password/:token", authController.verifyResetToken);
router.post("/reset-password/:token", authController.resetPassword);

// Google OAuth
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// [---------- SECURITY GATE (Authentication Required) ----------]
// บังคับว่าต้องมี Access Token ที่ถูกต้อง ตั้งแต่บรรทัดนี้เป็นต้นไป
router.use(authGuard);

// [---------- PROTECTED ROUTES (Authenticated users only) ----------]
router.get("/me", authController.getMe);
router.post("/change-password", authController.changePassword);
router.post("/logout", authController.logout);
router.delete("/me", authController.deleteAccount);

module.exports = router;
