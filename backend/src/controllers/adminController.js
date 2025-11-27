const adminService = require("../services/adminService");
const linkService = require("../services/linkService");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Get All Users (ดึงรายชื่อ User ทั้งหมด)
// -------------------------------------------------------------------
const getAllUsers = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Admin ดูทีละ 10 คนกำลังดี
    const search = req.query.search || "";

    const result = await adminService.getAllUsers(adminId, page, limit, search);

    // result คือ { users: [...], meta: {...} }
    res.json(result);
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

const changeUserRole = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const userIdToUpdate = parseInt(req.params.id);
    const { role } = req.body; // รับค่า "ADMIN" หรือ "USER"

    if (isNaN(userIdToUpdate)) {
      return res.status(400).json({ message: "Invalid User ID." });
    }

    const updatedUser = await adminService.changeUserRole(
      userIdToUpdate,
      adminId,
      role
    );

    res.json(updatedUser);
  } catch (error) {
    if (error.message.includes("Admins cannot change their own role")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

const updateUserLimit = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const userIdToUpdate = parseInt(req.params.id);
    const { limit } = req.body; // รับค่าตัวเลข

    if (isNaN(userIdToUpdate) || typeof limit !== "number") {
      return res.status(400).json({ message: "Invalid input." });
    }

    const updatedUser = await adminService.updateUserLimit(
      userIdToUpdate,
      adminId,
      limit
    );
    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
};

const getUserLinks = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    // รับ Query Params (Page, Search)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";

    // Reuse Logic เดิมของ linkService (มันรับ ownerId ได้อยู่แล้ว)
    const result = await linkService.findLinksByOwner(
      userId,
      page,
      limit,
      search
    );

    // เติม shortUrl ให้สมบูรณ์
    const linksWithUrl = result.links.map((link) => ({
      ...link,
      shortUrl: `${process.env.BASE_URL}/r/${link.slug}`,
    }));

    res.json({
      data: linksWithUrl,
      meta: result.meta,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserLinks,
  updateUserStatus,
  deleteUser,
  changeUserRole,
  updateUserLimit,
};
