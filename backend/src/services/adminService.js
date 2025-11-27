const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");

// ดึงรายชื่อ User ทั้งหมด (ยกเว้นตัวคนเรียกเอง)
const getAllUsers = async (adminId, page = 1, limit = 10, search = "") => {
  const skip = (page - 1) * limit;

  // เงื่อนไขค้นหา (ไม่เอาตัวเอง + ค้นหาตาม Email)
  const whereClause = {
    id: { not: adminId }, // ไม่เอาตัวเอง
    ...(search && {
      email: { contains: search, mode: "insensitive" },
    }),
  };

  const [total, users] = await prisma.$transaction([
    // 1. นับจำนวนทั้งหมดที่ตรงเงื่อนไข
    prisma.user.count({ where: whereClause }),

    // 2. ดึงข้อมูลตามหน้า
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        provider: true,
        role: true,
        isBlocked: true,
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
      totalPages: Math.ceil(total / limit),
    },
  };
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

const changeUserRole = async (userIdToUpdate, adminId, newRole) => {
  // Safety 1: ห้ามเปลี่ยน Role ตัวเอง
  if (userIdToUpdate === adminId) {
    throw new Error("Admins cannot change their own role.");
  }

  // Safety 2: Role ต้องถูกต้อง
  if (!["ADMIN", "USER"].includes(newRole)) {
    throw new Error("Invalid role.");
  }

  // อัปเดต Role
  return await prisma.user.update({
    where: { id: userIdToUpdate },
    data: { role: newRole },
    select: { id: true, email: true, role: true },
  });
};

const updateUserLimit = async (userId, adminId, newLimit) => {
  // Safety: Limit ต้องไม่ติดลบ
  if (newLimit < 0) throw new Error("Limit cannot be negative.");

  return await prisma.user.update({
    where: { id: userId },
    data: { linkLimit: newLimit },
    select: { id: true, email: true, linkLimit: true },
  });
};

module.exports = {
  getAllUsers,
  updateUserStatus,
  deleteUser,
  changeUserRole,
  updateUserLimit,
};
