const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAuthenticated, isAdmin } = require("../middlewares/authGuard");

// -------------------------------------------------------------------
// Security Gate (ด่านความปลอดภัย)
// -------------------------------------------------------------------
// isAuthenticated: ต้อง Login แล้วเท่านั้น
// isAdmin: ต้องมี Role เป็น 'ADMIN' เท่านั้น
router.use(isAuthenticated, isAdmin);

// -------------------------------------------------------------------
// User Management Routes (จัดการผู้ใช้งาน)
// -------------------------------------------------------------------
router.get("/users", adminController.getAllUsers);
router.get("/users/:id/links", adminController.getUserLinks);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.patch("/users/:id/role", adminController.changeUserRole);
router.patch("/users/:id/limit", adminController.updateUserLimit);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
