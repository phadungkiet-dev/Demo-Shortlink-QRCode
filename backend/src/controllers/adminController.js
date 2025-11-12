const adminService = require("../services/adminService");
const logger = require("../utils/logger");

/**
 * Controller to get all users
 */
const getAllUsers = async (req, res, next) => {
  try {
    // (req.user.id มาจาก Passport + isAdmin middleware)
    const adminId = req.user.id;

    const users = await adminService.getAllUsers(adminId);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

/**
 * (เพิ่มใหม่) Controller to update a user's status (Block/Unblock)
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const userIdToUpdate = parseInt(req.params.id);
    
    // 1. Validate ID
    if (isNaN(userIdToUpdate)) {
      return res.status(400).json({ message: "Invalid User ID." });
    }

    // 2. Validate Body (รับ 'isBlocked' (true/false) จาก Frontend)
    const { isBlocked } = req.body;
    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({ message: "Invalid request body. 'isBlocked' (boolean) is required." });
    }

    // 3. Call Service
    const updatedUser = await adminService.updateUserStatus(
      userIdToUpdate,
      adminId,
      isBlocked // (ส่งสถานะใหม่ (true/false) เข้าไป)
    );
    
    // 4. ส่ง User ที่อัปเดตแล้ว กลับไปให้ Frontend
    res.json(updatedUser);

  } catch (error) {
    // 5. (สำคัญ) จับ Error ที่ Service โยนมา
    if (error.message.includes("Admins cannot change their own status")) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes("User not found")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("Cannot change status of another Admin")) {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }
    
    // Error ทั่วไป
    next(error);
  }
};

/**
 * Controller to delete a user
 */
const deleteUser = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const userIdToDelete = parseInt(req.params.id);

    // 1. Validate ID
    if (isNaN(userIdToDelete)) {
      return res.status(400).json({ message: "Invalid User ID." });
    }

    // 2. Call Service (Service จะจัดการ Safety Checks ทั้งหมด)
    const result = await adminService.deleteUser(userIdToDelete, adminId);
    res.json(result);
  } catch (error) {
    // 3. (สำคัญ) จับ Error ที่ Service โยนมา

    if (error.message.includes("Admins cannot delete their own account")) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes("User not found")) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("Cannot delete another Admin")) {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }

    // Error ทั่วไป
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  deleteUser,
};
