const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { isAuthenticated, isAdmin } = require("../middlewares/authGuard");

// Security Gate: ต้อง Login และเป็น Admin เท่านั้น
router.use(isAuthenticated, isAdmin);

// Admin Routes
router.get("/users", adminController.getAllUsers);
router.get("/users/:id/links", adminController.getUserLinks);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.patch("/users/:id/role", adminController.changeUserRole);
router.patch("/users/:id/limit", adminController.updateUserLimit);
router.delete("/users/:id", adminController.deleteUser);

module.exports = router;
