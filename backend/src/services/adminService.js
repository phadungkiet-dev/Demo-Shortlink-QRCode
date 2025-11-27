const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

/**
 * @function getAllUsers
 * @description ดึงรายชื่อ User ทั้งหมด (ยกเว้นตัว Admin ผู้เรียก)
 */
const getAllUsers = async (adminId, page = 1, limit = 10, search = "") => {
  const skip = (page - 1) * limit;

  const whereClause = {
    id: { not: adminId }, // ไม่ดึงข้อมูลตัวเอง
    ...(search && {
      email: { contains: search, mode: "insensitive" },
    }),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where: whereClause }),
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        provider: true,
        role: true,
        isBlocked: true,
        linkLimit: true, // เพิ่ม field limit
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * @function updateUserStatus
 * @description Block หรือ Unblock ผู้ใช้
 */
const updateUserStatus = async (userId, adminId, isBlocked) => {
  // Safety Checks
  if (userId === adminId)
    throw new AppError("Cannot change your own status.", 400);

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new AppError("User not found.", 404);
  if (targetUser.role === "ADMIN")
    throw new AppError("Cannot block another Admin.", 403);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isBlocked },
    select: { id: true, email: true, isBlocked: true },
  });

  logger.info(`Admin ${adminId} updated user ${userId} status to ${isBlocked}`);
  return updatedUser;
};

/**
 * @function deleteUser
 * @description ลบผู้ใช้ถาวร
 */
const deleteUser = async (userId, adminId) => {
  if (userId === adminId)
    throw new AppError("Cannot delete your own account.", 400);

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new AppError("User not found.", 404);
  if (targetUser.role === "ADMIN")
    throw new AppError("Cannot delete another Admin.", 403);

  await prisma.user.delete({ where: { id: userId } });

  logger.info(`Admin ${adminId} deleted user ${userId}`);
  return { message: "User deleted successfully." };
};

/**
 * @function updateUserLimit
 * @description ปรับโควต้าลิงก์สูงสุดของผู้ใช้
 */
const updateUserLimit = async (userId, adminId, newLimit) => {
  if (newLimit < 0) throw new AppError("Limit cannot be negative.", 400);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { linkLimit: newLimit },
    select: { id: true, email: true, linkLimit: true },
  });

  return updatedUser;
};

/**
 * @function changeUserRole
 * @description เปลี่ยน Role (Admin <-> User)
 */
const changeUserRole = async (userId, adminId, newRole) => {
  if (userId === adminId)
    throw new AppError("Cannot change your own role.", 400);
  if (!["ADMIN", "USER"].includes(newRole))
    throw new AppError("Invalid role.", 400);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, email: true, role: true },
  });

  return updatedUser;
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  updateUserLimit,
  changeUserRole,
};
