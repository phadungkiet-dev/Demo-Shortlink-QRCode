const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const sendEmail = require("../utils/email");

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

/**
 * @function forgotPassword
 * @description สร้าง Reset Token และส่งอีเมล
 */
const forgotPassword = async (email) => {
  // 1. หา User จาก Email
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.provider !== "LOCAL") {
    // Security: ไม่บอกว่าหาไม่เจอ เพื่อป้องกัน Email Enumeration Attack
    // แต่ถ้าเป็น Google OAuth อาจจะบอกหน่อยว่า "Email นี้ผูกกับ Google" (Optional)
    throw new AppError("There is no account with that email address.", 404);
  }

  // 2. สร้าง Reset Token (Random String)
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 3. Hash Token ก่อนเก็บลง DB (เพื่อความปลอดภัย ถ้า DB หลุด Token ก็ยังใช้ไม่ได้ทันที)
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // 4. บันทึก Token และวันหมดอายุ (1 ชั่วโมง = 60 * 60 * 1000 ms)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    },
  });

  // 5. สร้าง URL สำหรับ Reset (Frontend Route)
  // หมายเหตุ: FRONTEND_URL ต้องตั้งใน .env (เช่น http://localhost:5173)
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const message = `
    You are receiving this email because you (or someone else) have requested the reset of the password for your account.
    Please click on the following link, or paste this into your browser to complete the process:
    \n\n
    ${resetUrl}
    \n\n
    If you did not request this, please ignore this email and your password will remain unchanged.
    Link expires in 1 hour.
  `;

  // 6. ส่งเมล
  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request (Valid for 10 mins)",
      text: message,
      // html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>` // ถ้าอยากทำ HTML สวยๆ
    });

    return { message: "Email sent successfully." };
  } catch (err) {
    // ถ้าส่งไม่ผ่าน ต้องล้าง Token ออกจาก DB เพื่อไม่ให้ค้าง
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    throw new AppError(
      "There was an error sending the email. Try again later.",
      500
    );
  }
};

/**
 * @function resetPassword
 * @description ตรวจสอบ Token และตั้งรหัสผ่านใหม่
 */
const resetPassword = async (token, newPassword) => {
  // 1. Hash Token ที่ได้จาก URL เพื่อไปเทียบกับใน DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 2. หา User ที่มี Token นี้ และยังไม่หมดอายุ
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() }, // Expires > Now
    },
  });

  if (!user) {
    throw new AppError("Token is invalid or has expired.", 400);
  }

  // 3. Hash รหัสผ่านใหม่
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // 4. อัปเดต User และล้าง Token ทิ้ง
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  return { message: "Password updated successfully! You can now log in." };
};

module.exports = {
  getSafeUser,
  registerUser,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
};
