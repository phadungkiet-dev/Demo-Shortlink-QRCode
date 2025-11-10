const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isAuthenticated } = require("../middlewares/authGuard");

// GET /api/auth/csrf
// Must be called by frontend to get a token before making state-changing requests
router.get("/csrf", authController.getCsrfToken);

// POST /api/auth/login
router.post("/login", authController.loginLocal);

// POST /api/auth/logout
router.post("/logout", isAuthenticated, authController.logout);

// POST /api/auth/change-password
router.post("/change-password", isAuthenticated, authController.changePassword);

// GET /api/auth/me (Get current user)
router.get("/me", isAuthenticated, authController.getMe);

// --- Google OAuth ---
// GET /api/auth/google (Starts the OAuth flow)
router.get("/google", authController.googleAuth);

// GET /api/auth/google/callback (Callback URL)
router.get("/google/callback", authController.googleCallback);

// POST /api/auth/register
router.post("/register", authController.register);


module.exports = router;
