const bcrypt = require("bcrypt");
const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");

/**
 * @function getSafeUser
 * @description ตัดข้อมูล Sensitive (เช่น Password Hash) ออกจาก User Object ก่อนส่งกลับไปให้ Client
 * @param {Object} user - ข้อมูล User ดิบจาก Database
 * @returns {Object|null} - User Object ที่ปลอดภัยแล้ว
 */
const getSafeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

/**
 * @function registerUser
 * @description สมัครสมาชิกใหม่ (Local Provider)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} - User ที่สร้างใหม่
 */
const registerUser = async (email, password) => {
  // 1. ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email address is already in use.", 409); // 409 Conflict
  }

  // 2. Hash Password (ความปลอดภัยระดับ 10 rounds)
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. สร้าง User ลง DB
  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      provider: "LOCAL",
      role: "USER",
      linkLimit: 10, // Default Limit
    },
  });

  return newUser;
};

/**
 * @function changePassword
 * @description เปลี่ยนรหัสผ่าน (เฉพาะ Local User)
 * @param {number} userId - ID ของผู้ใช้
 * @param {string} oldPassword - รหัสผ่านเดิม
 * @param {string} newPassword - รหัสผ่านใหม่
 * @returns {Promise<Object>} - Message ยืนยัน
 */
const changePassword = async (userId, oldPassword, newPassword) => {
  // 1. ดึงข้อมูล User
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Safety Check: ต้องมี User และเป็นแบบ Local เท่านั้น
  if (!user || user.provider !== "LOCAL" || !user.passwordHash) {
    throw new AppError(
      "User not found or cannot change password for this account type.",
      400
    );
  }

  // 2. ตรวจสอบรหัสผ่านเก่า
  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Incorrect old password.", 401); // 401 Unauthorized
  }

  // 3. Hash รหัสใหม่และบันทึก
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: "Password changed successfully." };
};

/**
 * @function deleteAccount
 * @description ลบบัญชีผู้ใช้ถาวร (Soft Delete หรือ Hard Delete ตาม Policy)
 * ในที่นี้ใช้ Hard Delete (Cascade จะลบ Link/Click ทั้งหมดให้อัตโนมัติ)
 * @param {number} userId
 */
const deleteAccount = async (userId) => {
  // ตรวจสอบก่อนว่ามี User ไหม (Optional แต่แนะนำเพื่อความชัวร์)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found.", 404);
  }

  await prisma.user.delete({
    where: { id: userId },
  });
  
  return { message: "Account deleted successfully." };
};

module.exports = {
  getSafeUser,
  registerUser,
  changePassword,
  deleteAccount,
};
