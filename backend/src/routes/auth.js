const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middlewares/authGuard");

// ===================================================================
// PUBLIC ROUTES (ใครเข้าก็ได้ ไม่ต้อง Login)
// ===================================================================
router.get("/csrf", authController.getCsrfToken);

router.post("/login", authController.loginLocal);
router.post("/register", authController.register);

// --- Password Recovery Routes ---
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

// --- Google OAuth ---
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// ===================================================================
// SECURITY GATE (ด่านตรวจคนเข้าเมือง)
// ===================================================================
router.use(isAuthenticated); // บังคับ Login ตั้งแต่บรรทัดนี้เป็นต้นไป

// ===================================================================
// PROTECTED ROUTES (ต้อง Login แล้วเท่านั้น)
// ===================================================================
router.get("/me", authController.getMe);
router.post("/change-password", authController.changePassword);
router.post("/logout", authController.logout);
router.delete("/me", authController.deleteAccount);

module.exports = router;
