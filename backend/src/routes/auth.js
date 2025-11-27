const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middlewares/authGuard");

// --- Public Routes ---
router.get("/csrf", authController.getCsrfToken);
router.post("/login", authController.loginLocal);
router.post("/register", authController.register);

// --- Google OAuth ---
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// --- Protected Routes ---
router.use(isAuthenticated); // บังคับ Login ตั้งแต่บรรทัดนี้เป็นต้นไป

router.post("/logout", authController.logout);
router.post("/change-password", authController.changePassword);
router.get("/me", authController.getMe);
router.delete("/me", authController.deleteAccount);

module.exports = router;
