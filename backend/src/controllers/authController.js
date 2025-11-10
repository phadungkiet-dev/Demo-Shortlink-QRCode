const passport = require("passport");
const { validationResult } = require("express-validator");
const {
  changePasswordSchema,
  loginSchema,
} = require("../utils/validationSchemas");
const authService = require("../services/authService");
const logger = require("../utils/logger");

// 1. Get CSRF Token
const getCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

// 2. Local Login
const loginLocal = (req, res, next) => {
  // Validate input
  try {
    loginSchema.parse(req.body);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Validation failed.", errors: error.errors });
  }

  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info.message || "Login failed." });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Send back safe user object (no hash)
      res.json(authService.getSafeUser(user));
    });
  })(req, res, next);
};

// 3. Logout
const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        logger.error("Failed to destroy session:", err);
      }
      res.clearCookie("connect.sid", { path: "/" });
      res.status(200).json({ message: "Logged out successfully." });
    });
  });
};

// 4. Change Password (Local users only)
const changePassword = async (req, res, next) => {
  try {
    // Validate input
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    if (req.user.provider !== "LOCAL") {
      return res
        .status(400)
        .json({ message: "Cannot change password for OAuth users." });
    }

    const result = await authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword
    );
    res.json(result);
  } catch (error) {
    if (error.message === "Incorrect old password.") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// 5. Get Current User (/me)
const getMe = (req, res) => {
  // req.user is populated by passport.deserializeUser
  res.json(authService.getSafeUser(req.user));
};

// 6. Google Auth (Start)
const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

// 7. Google Auth (Callback)
const googleCallback = (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Failed login (e.g., email already used locally)
      // Redirect to frontend error page
      logger.warn("Google Auth Failed:", info);
      const errorMsg = encodeURIComponent(
        info.message || "Google login failed."
      );
      return res.redirect(`${process.env.CORS_ORIGIN}/login?error=${errorMsg}`);
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Successful login, redirect to frontend dashboard
      res.redirect(`${process.env.CORS_ORIGIN}/dashboard`);
    });
  })(req, res, next);
};

module.exports = {
  getCsrfToken,
  loginLocal,
  logout,
  changePassword,
  getMe,
  googleAuth,
  googleCallback,
};
