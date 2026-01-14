const passport = require("passport");
const {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../utils/validationSchemas");
const authService = require("../services/authService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const { COOKIE } = require("../config/constants");

// Config Cookie สำหรับ Refresh Token
const cookieOptions = {
  httpOnly: true, // Client JS อ่านไม่ได้ (ป้องกัน XSS)
  secure:
    process.env.NODE_ENV === "production" || process.env.USE_HTTPS === "true",
  // SameSite:
  // - 'none' ถ้า Frontend/Backend คนละ Domain (และต้องมี Secure=true)
  // - 'lax' ถ้า Domain เดียวกัน หรือ Localhost
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
  path: "/", // ให้ Cookie ส่งไปทุก Path
};

// --- Helper: ส่ง Token Response ---
const sendTokenResponse = (user, statusCode, res) => {
  // สร้าง Token คู่ (Access + Refresh)
  const { accessToken, refreshToken } = authService.generateTokens(user);

  // ส่ง Refresh Token ไปเก็บใน HttpOnly Cookie
  res.cookie("refreshToken", refreshToken, cookieOptions);

  // ส่ง Access Token และข้อมูล User ไปใน Response Body (JSON)
  res.status(statusCode).json({
    status: "success",
    user: authService.getSafeUser(user),
    accessToken, // Client ต้องเก็บใน Memory (Variable / Context)
  });
};

// [---------- Login ----------]
const loginLocal = (req, res, next) => {
  // Validate Input
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return next(new AppError(parseResult.error.errors[0].message, 400));
  }

  // Authenticate via Passport Local Strategy
  passport.authenticate("local", { session: false }, (err, user, info) => {
    // System Error
    if (err) return next(err);

    // Auth Failed (Wrong password, User not found)
    if (!user) {
      return next(new AppError(info?.message || "Login failed.", 401));
    }

    // Success -> Send Tokens
    sendTokenResponse(user, 200, res);
  })(req, res, next);
};

// [---------- Logout ----------]
const logout = (req, res) => {
  // เคลียร์ Refresh Token Cookie
  res.clearCookie("refreshToken", {
    ...cookieOptions,
    maxAge: 0, // หมดอายุทันที
  });

  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully." });
};

// [---------- Refresh Token ----------]
const refreshToken = catchAsync(async (req, res, next) => {
  // อ่าน Refresh Token จาก Cookie
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return next(
      new AppError("Refresh token not found. Please login again.", 401)
    );
  }

  // เรียก Service เพื่อ Verify และขอ Access Token ใหม่
  const { accessToken, user } = await authService.refreshAccessToken(
    refreshToken
  );

  // ส่งค่ากลับ (อาจจะส่ง Refresh Token ตัวใหม่ไปด้วยถ้าทำ Rotation แต่ในที่นี้ส่งแค่ Access Token)
  res.status(200).json({
    status: "success",
    accessToken,
    user: authService.getSafeUser(user), // อัปเดตข้อมูล User ล่าสุดด้วย
  });
});

// [---------- Get Current User (/me) ----------]
const getMe = (req, res) => {
  // req.user มาจาก Auth Guard (JwtStrategy)
  // ถ้าไม่มี req.user แสดงว่า middleware ไม่ทำงาน หรือ token ผิดพลาด
  if (!req.user) {
    return res
      .status(401)
      .json({ status: "error", message: "Not authenticated" });
  }

  res.json({
    status: "success",
    user: authService.getSafeUser(req.user),
  });
};

// [---------- Google Auth ----------]
// เริ่มต้น Login: Redirect ไป Google
const googleAuth = (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false, // สำคัญ: ปิด Session
  })(req, res, next);
};

// Callback: Google ส่งค่ากลับมา
const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    const frontendUrl =
      process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173";

    if (err || !user) {
      logger.warn("Google Auth Failed:", info || err);
      const errorMsg = encodeURIComponent("Google login failed.");
      return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
    }

    // Login สำเร็จ -> สร้าง Token
    const { refreshToken } = authService.generateTokens(user);

    // 1. ฝาก Refresh Token ใน Cookie
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // 2. Redirect กลับ Frontend
    // ให้ Frontend ยิง /api/auth/refresh-token อีกทีเพื่อเอา Access Token
    res.redirect(`${frontendUrl}/auth/callback`);
  })(req, res, next);
};

// [---------- Register (Local) ----------]
const register = catchAsync(async (req, res, next) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new AppError(parseResult.error.errors[0].message, 400);
  }

  const { email, password } = parseResult.data;

  // สร้าง User ใหม่
  const newUser = await authService.registerUser(email, password);

  // สมัครเสร็จ Login ให้เลย (ส่ง Token กลับไป)
  sendTokenResponse(newUser, 201, res);
});

// [---------- Change Password ----------]
const changePassword = catchAsync(async (req, res, next) => {
  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new AppError(parseResult.error.errors[0].message, 400);
  }

  // ห้ามเปลี่ยนรหัสผ่าน ถ้า Login ด้วย Google
  if (req.user.provider !== "LOCAL") {
    throw new AppError("Cannot change password for OAuth users.", 400);
  }

  const { oldPassword, newPassword } = parseResult.data;

  // req.user.id มาจาก JWT Guard
  const result = await authService.changePassword(
    req.user.id,
    oldPassword,
    newPassword
  );

  res.status(200).json({ status: "success", message: result.message });
});

// [---------- Delete Account ----------]
const deleteAccount = catchAsync(async (req, res, next) => {
  await authService.deleteAccount(req.user.id);

  // ลบ Cookie ออกด้วย
  res.clearCookie("refreshToken", cookieOptions);

  res
    .status(200)
    .json({ status: "success", message: "Account deleted successfully." });
});

// [---------- Forgot ----------]
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) throw new AppError("Please provide your email address.", 400);

  const result = await authService.forgotPassword(email);
  res.status(200).json({ status: "success", ...result });
});

// [---------- Reset Password ----------]
const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const parseResult = resetPasswordSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new AppError(parseResult.error.errors[0].message, 400);
  }

  const { password } = parseResult.data;
  const result = await authService.resetPassword(token, password);

  res.status(200).json({ status: "success", ...result });
});

// [---------- Verify Token ----------]
const verifyResetToken = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  await authService.verifyResetToken(token);
  res.status(200).json({ status: "success", valid: true });
});

module.exports = {
  loginLocal,
  logout,
  refreshToken, // [ADDED]
  changePassword,
  getMe,
  googleAuth,
  googleCallback,
  register,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyResetToken,
};
