const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const { USER_ROLES } = require("../config/constants");

/**
 * @function getAllUsers
 * @description ดึงรายชื่อ User ทั้งหมดสำหรับหน้า Admin Dashboard
 * @param {number} adminId
 * @param {number} [page=1]
 * @param {number} [limit=10]
 * @param {string} [search=""]
 * @param {boolean|undefined} [isBlockedFilter=undefined] - กรองตามสถานะ Blocked
 */
const getAllUsers = async (
  adminId,
  page = 1,
  limit = 10,
  search = "",
  isBlockedFilter = undefined
) => {
  const skip = (page - 1) * limit;

  // Where Clause สำหรับการค้นหา/กรอง (Filter)
  const whereClause = {
    id: { not: adminId }, // ไม่ดึงข้อมูลตัวเอง
  };

  // Combine search and status filters
  const andConditions = [];

  if (search) {
    andConditions.push({
      email: { contains: search, mode: "insensitive" },
    });
  }

  if (isBlockedFilter !== undefined) {
    andConditions.push({
      isBlocked: isBlockedFilter,
    });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  // Fetch Matched Users and Count (สำหรับ Pagination)
  const [totalMatched, users] = await prisma.$transaction([
    prisma.user.count({ where: whereClause }), // Total count of filtered results
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        provider: true,
        role: true,
        isBlocked: true,
        linkLimit: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { links: true } }, // นับจำนวนลิงก์
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  // Fetch Global Stats (Total, Active, Blocked for KPI cards)
  // ใช้เงื่อนไขที่ไม่มี filter/search เพื่อให้ได้ Total Users ที่แท้จริง (ยกเว้น Admin ตัวเอง)
  const [total, active, blocked] = await prisma.$transaction([
    prisma.user.count({ where: { id: { not: adminId } } }), // All users (excluding admin)
    prisma.user.count({ where: { id: { not: adminId }, isBlocked: false } }), // Active
    prisma.user.count({ where: { id: { not: adminId }, isBlocked: true } }), // Blocked
  ]);

  return {
    users,
    meta: {
      total: totalMatched, // Total for current filter/search
      page,
      limit,
      totalPages: Math.ceil(totalMatched / limit) || 1,
      totalItems: totalMatched,
    },
    // Return Stats for KPI cards
    stats: {
      total,
      active,
      blocked,
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
  if (targetUser.role === USER_ROLES.ADMIN)
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
  if (targetUser.role === USER_ROLES.ADMIN)
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

  // if (!["ADMIN", "USER"].includes(newRole))
  //   throw new AppError("Invalid role.", 400);

  if (!Object.values(USER_ROLES).includes(newRole)) {
    throw new AppError("Invalid role.", 400);
  }

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
