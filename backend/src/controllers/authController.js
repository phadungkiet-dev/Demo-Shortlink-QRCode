const passport = require("passport");
const {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} = require("../utils/validationSchemas");
const authService = require("../services/authService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");
const { COOKIE } = require("../config/constants");

// -------------------------------------------------------------------
// CSRF Token Endpoint
// -------------------------------------------------------------------
const getCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

// -------------------------------------------------------------------
// Local Login (Email + Password)
// -------------------------------------------------------------------
// ไม่ใช้ catchAsync เพราะ Passport ใช้ Callback Style
const loginLocal = (req, res, next) => {
  // Validate Input (ถ้าผิด Zod จะ throw error -> Global Handler)
  try {
    loginSchema.parse(req.body);
  } catch (error) {
    return next(error);
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err); // System Error

    if (!user) {
      // Login Failed (ส่ง 401 พร้อม Message)
      return next(new AppError(info.message || "Login failed.", 401));
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      if (req.body.rememberMe) {
        // 7 days in milliseconds
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
      } else {
        // Default: 15 mins
        req.session.cookie.maxAge = parseInt(
          process.env.COOKIE_MAX_AGE_MS || COOKIE.MAX_AGE
        );
      }
      res.json(authService.getSafeUser(user));
    });
  })(req, res, next);
};

// -------------------------------------------------------------------
// Logout
// -------------------------------------------------------------------
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((err) => {
      if (err) logger.error("Failed to destroy session:", err);

      res.clearCookie(COOKIE.NAME, { path: "/" });
      res.status(200).json({ message: "Logged out successfully." });
    });
  });
};

// -------------------------------------------------------------------
// Change Password
// -------------------------------------------------------------------
const changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

  // ห้ามเปลี่ยนรหัสผ่าน ถ้า Login ด้วย Google (เพราะไม่มีรหัสผ่านในระบบ)
  if (req.user.provider !== "LOCAL") {
    throw new AppError("Cannot change password for OAuth users.", 400);
  }

  const result = await authService.changePassword(
    req.user.id,
    oldPassword,
    newPassword
  );
  res.json(result);
});

// -------------------------------------------------------------------
// Get Current User (/me)
// -------------------------------------------------------------------
const getMe = (req, res) => {
  res.json(authService.getSafeUser(req.user));
};

// -------------------------------------------------------------------
// Google Auth
// -------------------------------------------------------------------
const googleAuth = (req, res, next) => {
  // ถ้า user ส่ง ?rememberMe=true มา ให้เก็บลง Session ชั่วคราว
  if (req.query.rememberMe === "true") {
    req.session.isRememberMe = true;
  } else {
    req.session.isRememberMe = false;
  }

  // เรียก Passport ตามปกติ
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
};

const googleCallback = (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) return next(err);

    // Get the primary frontend URL (handle comma-separated list)
    const rawFrontendUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN;
    const frontendUrl = rawFrontendUrl
      ? rawFrontendUrl.split(",")[0]
      : "http://localhost:5173";

    if (!user) {
      logger.warn("Google Auth Failed:", info);
      const errorMsg = encodeURIComponent(
        info.message || "Google login failed."
      );
      return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      // ตรวจสอบค่าที่ฝากไว้ใน Session
      if (req.session.isRememberMe) {
        // 7 วัน
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
      } else {
        // Default (15 นาที)
        req.session.cookie.maxAge = parseInt(
          process.env.COOKIE_MAX_AGE_MS || COOKIE.MAX_AGE
        );
      }

      // ล้างค่าชั่วคราวทิ้ง (Clean up)
      delete req.session.isRememberMe;

      res.redirect(`${frontendUrl}/dashboard`);
    });
  })(req, res, next);
};

// -------------------------------------------------------------------
// Local Registration
// -------------------------------------------------------------------
const register = catchAsync(async (req, res, next) => {
  const { email, password } = registerSchema.parse(req.body);

  // Service จะ throw AppError(409) ถ้า email ซ้ำ
  const newUser = await authService.registerUser(email, password);

  // Auto Login หลังสมัครเสร็จ
  req.logIn(newUser, (err) => {
    if (err) return next(err);
    res.status(201).json(authService.getSafeUser(newUser));
  });
});

// -------------------------------------------------------------------
// Delete Account
// -------------------------------------------------------------------
const deleteAccount = catchAsync(async (req, res, next) => {
  await authService.deleteAccount(req.user.id);

  // Destroy Session
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy();
    res.clearCookie(COOKIE.NAME);
    res.json({ message: "Account deleted successfully." });
  });
});

// -------------------------------------------------------------------
// Forgot Password (Request Token)
// -------------------------------------------------------------------
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError("Please provide your email address.", 400);
  }

  const result = await authService.forgotPassword(email);
  res.status(200).json(result);
});

// -------------------------------------------------------------------
// Reset Password (Verify Token & Set New Password)
// -------------------------------------------------------------------
const resetPassword = catchAsync(async (req, res, next) => {
  // Token มาจาก URL params (/api/auth/reset-password/:token)
  const { token } = req.params;

  // ใช้ Zod Schema ตรวจสอบแทนการเขียน if เอง
  // ถ้าไม่ผ่าน Zod จะ throw Error ไปที่ Global Handler ให้เอง
  // และจะได้กฎความยากของรหัสผ่านที่เหมือนกับตอนสมัครสมาชิกเป๊ะๆ
  const { password } = resetPasswordSchema.parse(req.body);

  const result = await authService.resetPassword(token, password);
  res.status(200).json(result);
});

module.exports = {
  getCsrfToken,
  loginLocal,
  logout,
  changePassword,
  getMe,
  googleAuth,
  googleCallback,
  register,
  deleteAccount,
  forgotPassword,
  resetPassword,
};
