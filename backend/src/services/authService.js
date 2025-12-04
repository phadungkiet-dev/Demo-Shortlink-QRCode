const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const { sendEmail, resetPasswordTemplate } = require("../utils/email");
const { DEFAULTS, USER_ROLES } = require("../config/constants");

/**
 * @function buildResetHtmlTemplate
 * @description สร้าง HTML Template สำหรับอีเมล Reset Password ที่มีดีไซน์
 */
const buildResetHtmlTemplate = (resetUrl) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="padding: 30px; text-align: center;">
          
          <h1 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 20px 0;">
            Shortlink<span style="color: #4f46e5;">.QR</span>
          </h1>

          <p style="font-size: 16px; color: #374151; margin-bottom: 25px; line-height: 1.5;">
            You have requested a password reset for your account. Click the button below to proceed.
          </p>

          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
            <tr>
              <td align="center" style="border-radius: 12px; background-color: #4f46e5; padding: 0;">
                <a href="${resetUrl}" target="_blank" style="font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 12px; border: 1px solid #4f46e5;">
                  Reset My Password
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin-top: 0;">
            This link will expire in 1 hour. If you did not request this, please ignore this email.
          </p>
          
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 30px 20px; text-align: center;">
          <p style="font-size: 12px; color: #9ca3af;">
            If the button above doesn't work, copy and paste this link:
            <br><a href="${resetUrl}" style="word-break: break-all; color: #4f46e5;">${resetUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

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
  // ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email address is already in use.", 409); // 409 Conflict
  }

  // Hash Password (ความปลอดภัยระดับ 10 rounds)
  const passwordHash = await bcrypt.hash(password, 10);

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
 * @param {number} userId - ID ของผู้ใช้
 * @param {string} oldPassword - รหัสผ่านเดิม
 * @param {string} newPassword - รหัสผ่านใหม่
 * @returns {Promise<Object>} - Message ยืนยัน
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
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    },
  });

  // สร้าง URL สำหรับ Reset (Frontend Route)
  // หมายเหตุ: FRONTEND_URL ต้องตั้งใน .env (เช่น http://localhost:5173)
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const textMessage = `
    You are receiving this email because you (or someone else) have requested the reset of the password for your account.
    Please click on the following link, or paste this into your browser to complete the process:
    \n\n
    ${resetUrl}
    \n\n
    If you did not request this, please ignore this email and your password will remain unchanged.
    Link expires in 1 hour.
  `;

  // Generate HTML version of the email
  const htmlMessage = buildResetHtmlTemplate(resetUrl);

  // ส่งเมล
  try {
    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      text: textMessage, // Send the plain text version
      html: resetPasswordTemplate(resetUrl) // Send the beautiful HTML version
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
  const passwordHash = await bcrypt.hash(newPassword, 10);

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

module.exports = {
  getSafeUser,
  registerUser,
  changePassword,
  deleteAccount,
  forgotPassword,
  resetPassword,
};
