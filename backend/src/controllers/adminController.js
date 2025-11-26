const adminService = require("../services/adminService");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Get All Users (ดึงรายชื่อ User ทั้งหมด)
// -------------------------------------------------------------------
const getAllUsers = async (req, res, next) => {
  try {
    // ดึง ID ของ Admin คนที่เรียก API นี้ (จาก Session)
    // เพื่อส่งให้ Service กรองตัวเองออกจากผลลัพธ์ (จะได้ไม่เห็นตัวเองในลิสต์ที่จะแบน)
    const adminId = req.user.id;

    const users = await adminService.getAllUsers(adminId);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------
// Update User Status (Block/Unblock)
// -------------------------------------------------------------------
const updateUserStatus = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const userIdToUpdate = parseInt(req.params.id);

    // Validate ID: ต้องเป็นตัวเลขเท่านั้น
    if (isNaN(userIdToUpdate)) {
      return res.status(400).json({ message: "Invalid User ID." });
    }

    // Validate Body: ต้องส่งค่า isBlocked เป็น true หรือ false เท่านั้น
    const { isBlocked } = req.body;
    if (typeof isBlocked !== "boolean") {
      return res.status(400).json({
        message: "Invalid request body. 'isBlocked' (boolean) is required.",
      });
    }

    // เรียก Service เพื่ออัปเดตสถานะ
    const updatedUser = await adminService.updateUserStatus(
      userIdToUpdate,
      adminId,
      isBlocked // (ส่งสถานะใหม่ (true/false) เข้าไป)
    );

    // ส่งข้อมูล User ล่าสุดกลับไปเพื่อให้ Frontend อัปเดต UI ทันที
    res.json(updatedUser);
  } catch (error) {
    // (สำคัญ) แปลง Error จาก Service ให้เป็น HTTP Status Code ที่มีความหมาย

    // กรณีพยายามแบนตัวเอง -> 400 (Bad Request)
    if (error.message.includes("Admins cannot change their own status")) {
      return res.status(400).json({ message: error.message });
    }
    // กรณีหา User ไม่เจอ -> 404 (Not Found)
    if (error.message.includes("User not found")) {
      return res.status(404).json({ message: error.message });
    }
    // กรณีพยายามแบน Admin คนอื่น -> 403 (Forbidden - ห้ามทำ)
    if (error.message.includes("Cannot change status of another Admin")) {
      return res.status(403).json({ message: error.message }); // 403 Forbidden
    }

    // Error อื่นๆ (เช่น DB ล่ม) ส่งต่อให้ Global Error Handler
    next(error);
  }
};

// -------------------------------------------------------------------
// Delete User (ลบ User ถาวร)
// -------------------------------------------------------------------
const deleteUser = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const userIdToDelete = parseInt(req.params.id);

    // Validate ID
    if (isNaN(userIdToDelete)) {
      return res.status(400).json({ message: "Invalid User ID." });
    }

    // เรียก Service (Service จะมี Logic เช็คความปลอดภัยซ้ำอีกที)
    const result = await adminService.deleteUser(userIdToDelete, adminId);
    res.json(result);
  } catch (error) {
    // จัดการ Error เฉพาะทางเหมือนกับ updateStatus

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
