const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");

// ดึงรายชื่อ User ทั้งหมด (ยกเว้นตัวคนเรียกเอง)
const getAllUsers = async (adminId) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: adminId }, // ซ่อนตัวเองจาก List
      },
      select: {
        // เลือกเฉพาะข้อมูลที่จำเป็น (ไม่เอา Password)
        id: true,
        email: true,
        provider: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return users;
  } catch (error) {
    logger.error("Error fetching all users:", error);
    throw new Error("Could not fetch users.");
  }
};

// เปลี่ยนสถานะ Block/Unblock
const updateUserStatus = async (userIdToUpdate, adminId, newStatus) => {
  // Safety 1: ห้ามแก้ตัวเอง
  if (userIdToUpdate === adminId) {
    throw new Error("Admins cannot change their own status.");
  }

  try {
    // Safety 2: หา User เป้าหมายก่อน
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userIdToUpdate },
    });

    if (!userToUpdate) {
      throw new Error("User not found.");
    }

    // Safety 3: ห้ามแก้ Admin คนอื่น
    if (userToUpdate.role === "ADMIN") {
      throw new Error("Cannot change status of another Admin account.");
    }

    // ผ่านทุกด่าน -> อัปเดตได้
    const updatedUser = await prisma.user.update({
      where: { id: userIdToUpdate },
      data: {
        isBlocked: newStatus, // (ตั้งค่า 'isBlocked' (true หรือ false))
      },
      select: {
        // (ส่ง User ที่ 'ปลอดภัย' (Safe) กลับไปให้ Frontend)
        id: true,
        email: true,
        provider: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error) {
    logger.error(
      `Admin (ID: ${adminId}) failed to update status for user (ID: ${userIdToUpdate}):`,
      error
    );
    throw new Error(error.message || "Could not update user status.");
  }
};

// ลบ User ถาวร
const deleteUser = async (userIdToDelete, adminId) => {
  // (Safety Check 1) Admin cannot delete themselves
  if (userIdToDelete === adminId) {
    throw new Error("Admins cannot delete their own account.");
  }

  try {
    // (Safety Check 2) Find the user first to check their role
    const userToDelete = await prisma.user.findUnique({
      where: { id: userIdToDelete },
    });

    if (!userToDelete) {
      throw new Error("User not found.");
    }

    // (Safety Check 3) Prevent an Admin from deleting another Admin
    // (This can be changed later, but it's a good default safety)
    if (userToDelete.role === "ADMIN") {
      throw new Error("Cannot delete another Admin account.");
    }

    // Prisma จะลบ Links และ Clicks ของ User นี้ให้อัตโนมัติ (Cascade Delete)
    await prisma.user.delete({
      where: { id: userIdToDelete },
    });

    return { message: "User deleted successfully." };
  } catch (error) {
    logger.error(
      `Admin (ID: ${adminId}) failed to delete user (ID: ${userIdToDelete}):`,
      error
    );
    // (ส่งต่อ Error ที่เรา throw (เช่น 'User not found')
    throw new Error(error.message || "Could not delete user.");
  }
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  deleteUser,
};
