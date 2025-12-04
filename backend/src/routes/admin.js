const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAuthenticated, isAdmin } = require("../middlewares/authGuard");

// -------------------------------------------------------------------
// Security Gate (Admin Access Only)
// -------------------------------------------------------------------
// บังคับใช้ Authentication และ Authorization (Admin Role) กับทุก Route ในไฟล์นี้
router.use(isAuthenticated, isAdmin);

// -------------------------------------------------------------------
// User Management Routes
// -------------------------------------------------------------------
// Get All Users (with pagination & search)
router.get("/users", adminController.getAllUsers);

// Get User Links (View as Admin)
router.get("/users/:id/links", adminController.getUserLinks);

// Update User Status (Block/Unblock)
router.patch("/users/:id/status", adminController.updateUserStatus);

// Change User Role (Admin <-> User)
router.patch("/users/:id/role", adminController.changeUserRole);

// Update Link Limit (Quota)
router.patch("/users/:id/limit", adminController.updateUserLimit);

// Delete User (Hard Delete)
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
