const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middlewares/authGuard");

// ===================================================================
// PUBLIC ROUTES (Anyone can access)
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
// SECURITY GATE (Authentication Required)
// ===================================================================
// บังคับ Login ตั้งแต่บรรทัดนี้เป็นต้นไป
router.use(isAuthenticated);

// ===================================================================
// PROTECTED ROUTES (Authenticated users only)
// ===================================================================
router.get("/me", authController.getMe);
router.post("/change-password", authController.changePassword);
router.post("/logout", authController.logout);
router.delete("/me", authController.deleteAccount);

module.exports = router;
