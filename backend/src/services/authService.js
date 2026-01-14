const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const { sendEmail, resetPasswordTemplate } = require("../utils/email");
const { DEFAULTS, USER_ROLES, SECURITY } = require("../config/constants");

// Constants for JWT
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * @function getSafeUser
 * @description ตัดข้อมูล Sensitive ออกจาก User Object ก่อนส่งกลับ Client
 */
const getSafeUser = (user) => {
  if (!user) return null;
  const {
    passwordHash,
    resetPasswordToken,
    resetPasswordExpires,
    ...safeUser
  } = user;
  return safeUser;
};

/**
 * @function generateTokens
 * @description สร้าง Access Token และ Refresh Token
 */
const generateTokens = (user) => {
  const payload = { sub: user.id, role: user.role };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

/**
 * @function verifyUserCredentials
 * @description ตรวจสอบ Email และ Password (สำหรับ Local Login)
 */
const verifyUserCredentials = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError("Incorrect email or password.", 401);
  }

  // Check provider type
  if (!user.passwordHash) {
    throw new AppError(
      "This email is registered with Google. Please login with Google.",
      400
    );
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Incorrect email or password.", 401);
  }

  return user;
};

/**
 * @function handleGoogleAuth
 * @description จัดการ Login/Register ผ่าน Google (Find or Create)
 */
const handleGoogleAuth = async (email, googleId, name, avatar) => {
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // ถ้ามี User อยู่แล้ว แต่ยังไม่มี googleId (เช่นเคยสมัคร Local ไว้) -> Link Account
    if (!user.providerId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          provider: "GOOGLE",
          providerId: googleId,
        },
      });
    }
  } else {
    // สมัครสมาชิกใหม่
    user = await prisma.user.create({
      data: {
        email,
        provider: "GOOGLE",
        providerId: googleId,
        role: USER_ROLES.USER,
        linkLimit: DEFAULTS.LINK_LIMIT,
      },
    });
  }
  return user;
};

/**
 * @function refreshAccessToken
 * @description ตรวจสอบ Refresh Token และออก Access Token ใหม่
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verify Signature
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      throw new AppError("User not found.", 401);
    }

    // 3. Generate new tokens
    // หมายเหตุ: เราคืน accessToken ใหม่ ส่วน refreshToken อาจจะใช้ตัวเดิมหรือสร้างใหม่ก็ได้ (Rotation)
    // ในที่นี้เลือกสร้างใหม่เฉพาะ Access Token เพื่อลดความซับซ้อนของ Client แต่ถ้าต้องการความปลอดภัยสูงสุดควรทำ Rotation
    const tokens = generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      user,
    };
  } catch (err) {
    throw new AppError("Invalid or expired refresh token.", 403);
  }
};

/**
 * @function registerUser
 * @description สมัครสมาชิกใหม่ (Local Provider)
 */
const registerUser = async (email, password) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email address is already in use.", 409);
  }

  const passwordHash = await bcrypt.hash(password, SECURITY.SALT_ROUNDS);

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
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.provider !== "LOCAL" || !user.passwordHash) {
    throw new AppError(
      "User not found or cannot change password for this account type.",
      400
    );
  }

  const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Incorrect old password.", 401);
  }

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
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.provider !== "LOCAL") {
    // Security: Return generic message or specific if Google
    throw new AppError("There is no account with that email address.", 404);
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + DEFAULTS.PASSWORD_RESET_EXPIRY_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    },
  });

  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",")[0]
    : "http://localhost:5173";
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  const textMessage = `
    You have requested a password reset. 
    Click here: ${resetUrl}
    (Link expires in 1 hour)
  `;

  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: textMessage,
      html: resetPasswordTemplate(resetUrl),
    });

    return { message: "Email sent successfully." };
  } catch (err) {
    // Rollback token if email fails
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
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Token is invalid or has expired.", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SECURITY.SALT_ROUNDS);

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
      resetPasswordExpires: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError("Token is invalid or has expired.", 400);
  }

  return true;
};

module.exports = {
  getSafeUser,
  generateTokens,
  verifyUserCredentials,
  handleGoogleAuth,
  refreshAccessToken,
  registerUser,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyResetToken,
};
