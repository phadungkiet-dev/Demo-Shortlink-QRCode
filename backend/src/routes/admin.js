const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authGuard, adminGuard } = require("../middlewares/authGuard");

// [---------- Security Gate (Admin Access Only) ----------]
// 1. authGuard: ตรวจสอบ Access Token (Login หรือยัง?)
// 2. adminGuard: ตรวจสอบ Role (เป็น Admin หรือไม่?)
router.use(authGuard, adminGuard);

// [---------- User Management Routes ----------]
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
