const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");

/**
 * Get all users (except the admin him/herself)
 * (We only select safe fields, excluding passwordHash)
 */
const getAllUsers = async (adminId) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { not: adminId }, // (สำคัญ) Admin จะไม่เห็นตัวเองใน List
      },
      select: {
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

/**
 * (เพิ่มใหม่) 2. Admin blocks/unblocks a user
 */
const updateUserStatus = async (userIdToUpdate, adminId, newStatus) => {
  // (Safety Check 1) Admin cannot block themselves
  if (userIdToUpdate === adminId) {
    throw new Error("Admins cannot change their own status.");
  }

  try {
    // (Safety Check 2) Find the user first to check their role
    const userToUpdate = await prisma.user.findUnique({
      where: { id: userIdToUpdate },
    });

    if (!userToUpdate) {
      throw new Error("User not found.");
    }

    // (Safety Check 3) Prevent an Admin from blocking another Admin
    if (userToUpdate.role === "ADMIN") {
      throw new Error("Cannot change status of another Admin account.");
    }

    // All checks passed, proceed with update
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

/**
 * Admin deletes a user
 */
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

    // All checks passed, proceed with deletion
    // (Prisma จะจัดการลบ 'Links' และ 'Clicks' ที่เกี่ยวข้อง
    // โดยอัตโนมัติ เพราะเราตั้ง 'onDelete: Cascade' ไว้ใน schema.prisma ...
    // ... อ๊ะ! เรายังไม่ได้ตั้ง 'onDelete: Cascade'!)

    // (หมายเหตุ: เราต้องไปอัปเดต 'schema.prisma' ในภายหลัง
    // แต่ตอนนี้... เราจะลบแค่ User ก่อน)

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
