const passport = require("passport");
const {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} = require("../utils/validationSchemas");
const authService = require("../services/authService");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");

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

      res.clearCookie("connect.sid", { path: "/" });
      res.status(200).json({ message: "Logged out successfully." });
    });
  });
};

// -------------------------------------------------------------------
// Change Password
// -------------------------------------------------------------------
const changePassword = catchAsync(async (req, res, next) => {
  const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

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
const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

const googleCallback = (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      logger.warn("Google Auth Failed:", info);
      const errorMsg = encodeURIComponent(
        info.message || "Google login failed."
      );
      return res.redirect(`${process.env.CORS_ORIGIN}/login?error=${errorMsg}`);
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.redirect(`${process.env.CORS_ORIGIN}/dashboard`);
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
    res.clearCookie("connect.sid");
    res.json({ message: "Account deleted successfully." });
  });
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
};
