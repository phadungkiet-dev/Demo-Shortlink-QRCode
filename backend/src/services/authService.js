const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const { sendEmail, resetPasswordTemplate } = require("../utils/email");
const { DEFAULTS, USER_ROLES, SECURITY } = require("../config/constants");

/**
 * @function getSafeUser
 * @description ตัดข้อมูล Sensitive (เช่น Password Hash) ออกจาก User Object ก่อนส่งกลับไปให้ Client
 */
const getSafeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

/**
 * @function registerUser
 * @description สมัครสมาชิกใหม่ (Local Provider)
 */
const registerUser = async (email, password) => {
  // ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email address is already in use.", 409);
  }

  // Use SECURITY.SALT_ROUNDS instead of 10
  const passwordHash = await bcrypt.hash(password, SECURITY.SALT_ROUNDS);

  // สร้าง User ลง DB
  const newUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      provider: "LOCAL",
      role: USER_ROLES.USER,
      linkLimit: DEFAULTS.LINK_LIMIT,
    },
  });

  return newUser;
};

/**
 * @function changePassword
 * @description เปลี่ยนรหัสผ่าน (เฉพาะ Local User)
 */
const changePassword = async (userId, oldPassword, newPassword) => {
  // ดึงข้อมูล User
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Safety Check: ต้องมี User และเป็นแบบ Local เท่านั้น
  if (!user || user.provider !== "LOCAL" || !user.passwordHash) {
    throw new AppError(
      "User not found or cannot change password for this account type.",
      400
    );
  }

  // ตรวจสอบรหัสผ่านเก่า
  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Incorrect old password.", 401); // 401 Unauthorized
  }

  // Hash รหัสใหม่และบันทึก
  const newPasswordHash = await bcrypt.hash(newPassword, SECURITY.SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: "Password changed successfully." };
};

/**
 * @function deleteAccount
 * @description ลบบัญชีผู้ใช้ถาวร
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
  // หา User จาก Email
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.provider !== "LOCAL") {
    // Security: ไม่บอกว่าหาไม่เจอ เพื่อป้องกัน Email Enumeration Attack
    // แต่ถ้าเป็น Google OAuth อาจจะบอกหน่อยว่า "Email นี้ผูกกับ Google" (Optional)
    throw new AppError("There is no account with that email address.", 404);
  }

  // สร้าง Reset Token (Random String)
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash Token ก่อนเก็บลง DB (เพื่อความปลอดภัย ถ้า DB หลุด Token ก็ยังใช้ไม่ได้ทันที)
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // บันทึก Token และวันหมดอายุ (1 ชั่วโมง = 60 * 60 * 1000 ms)
  const expiresAt = new Date(Date.now() + DEFAULTS.PASSWORD_RESET_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    },
  });

  // [Important] ใช้ FRONTEND_URL จาก ENV (ถ้าไม่มีให้ใช้ Localhost เป็น Default)
  // ระวัง: .env เก่าอาจไม่มีตัวแปรนี้ ต้องแน่ใจว่าเพิ่มแล้ว หรือใช้ Logic แบบ controller ก็ได้
  // แต่ใน Service ควรรับค่าที่ถูกต้องมาเลย
  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")[0]
    : "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  const textMessage = `
    You have requested a password reset. 
    Click here: ${resetUrl}
    (Link expires in 1 hour)
  `;

  // ส่งเมล
  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: textMessage, // Send the plain text version
      html: resetPasswordTemplate(resetUrl), // Send the beautiful HTML version
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
  // Hash Token ที่ได้จาก URL เพื่อไปเทียบกับใน DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // หา User ที่มี Token นี้ และยังไม่หมดอายุ
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() }, // Expires > Now
    },
  });

  if (!user) {
    throw new AppError("Token is invalid or has expired.", 400);
  }

  // Hash รหัสผ่านใหม่
  const passwordHash = await bcrypt.hash(newPassword, SECURITY.SALT_ROUNDS);

  // อัปเดต User และล้าง Token ทิ้ง
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

/**
 * @function verifyResetToken
 * @description ตรวจสอบว่า Token ยังใช้งานได้ไหม (สำหรับ Pre-check หน้าเว็บ)
 */
const verifyResetToken = async (token) => {
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() }, // ต้องยังไม่หมดอายุ
    },
  });

  if (!user) {
    throw new AppError("Token is invalid or has expired.", 400);
  }

  return true; // Token ใช้ได้
};

module.exports = {
  getSafeUser,
  registerUser,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyResetToken,
};
