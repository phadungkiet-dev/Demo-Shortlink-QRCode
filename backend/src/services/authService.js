const { prisma } = require("../config/prisma");
const bcrypt = require("bcrypt");

// ฟังก์ชันเปลี่ยนรหัสผ่าน
const changePassword = async (userId, oldPassword, newPassword) => {
  // หา User จาก ID
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // เช็คว่า User มีจริงไหม และต้องเป็น Local User เท่านั้น (Google Login ไม่มีรหัสให้เปลี่ยน)
  if (!user || user.provider !== "LOCAL" || !user.passwordHash) {
    throw new Error("User not found or not a local user.");
  }

  // เช็คว่ารหัสเก่าถูกต้องไหม
  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Incorrect old password.");
  }

  // Hash รหัสใหม่ แล้วบันทึกทับ
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: "Password changed successfully." };
};

// Helper: ตัดข้อมูลลับ (Password Hash) ออกจาก User Object
const getSafeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user; // แยก passwordHash ทิ้งไป
  return safeUser; // ส่งคืนเฉพาะข้อมูลที่ปลอดภัย
};

// ฟังก์ชันสมัครสมาชิกใหม่ (Register)
const registerUser = async (email, password) => {
  // เช็คก่อนว่าอีเมลซ้ำไหม
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email address is already in use.");
  }

  // Hash Password (ความปลอดภัยระดับ 10 rounds)
  const passwordHash = await bcrypt.hash(password, 10);

  // สร้าง User ใหม่ใน DB
  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      provider: "LOCAL", // ระบุว่าเป็นแบบ Local
      role: "USER",
    },
  });

  return newUser;
};

module.exports = {
  changePassword,
  getSafeUser,
  registerUser,
};
