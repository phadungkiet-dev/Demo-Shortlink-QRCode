const passport = require("passport");
const { validationResult } = require("express-validator");
const {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} = require("../utils/validationSchemas");
const authService = require("../services/authService");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// CSRF Token Endpoint
// -------------------------------------------------------------------
// Frontend ต้องยิงมาที่นี่ก่อนเป็นอันดับแรก เพื่อขอ Token ไปแปะใน Header (x-csrf-token)
// สำหรับ Request ถัดไป (Login, Register, Post ต่างๆ)
const getCsrfToken = (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
};

// -------------------------------------------------------------------
// Local Login (Email + Password)
// -------------------------------------------------------------------
const loginLocal = (req, res, next) => {
  // ตรวจสอบความถูกต้องของข้อมูลที่ส่งมา (Validate Input)
  try {
    loginSchema.parse(req.body);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Validation failed.", errors: error.errors });
  }

  // เรียกใช้ Passport Strategy ชื่อ 'local' (ที่เรา config ไว้ใน passport.js)'
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err); // Error จากระบบ (เช่น DB ล่ม)
    }
    if (!user) {
      // Login ไม่ผ่าน (เช่น รหัสผิด, ไม่พบ User)
      return res.status(401).json({ message: info.message || "Login failed." });
    }
    // Login สำเร็จ -> สร้าง Session (Serialize User)
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // ส่งข้อมูล User ที่ปลอดภัย (ไม่มี Password) กลับไป
      res.json(authService.getSafeUser(user));
    });
  })(req, res, next);
};

// -------------------------------------------------------------------
// Logout
// -------------------------------------------------------------------
const logout = (req, res, next) => {
  // ลบข้อมูล User ออกจาก req
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    // ทำลาย Session ใน Database
    req.session.destroy((err) => {
      if (err) {
        logger.error("Failed to destroy session:", err);
      }
      // ลบ Cookie ที่ฝั่ง Client
      res.clearCookie("connect.sid", { path: "/" });
      res.status(200).json({ message: "Logged out successfully." });
    });
  });
};

// -------------------------------------------------------------------
// Change Password
// -------------------------------------------------------------------
const changePassword = async (req, res, next) => {
  try {
    // Validate Input (เช็คว่ารหัสใหม่ตรงกับยืนยันรหัสผ่านไหม ฯลฯ)
    const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

    // ป้องกัน User ที่ Login ผ่าน Google มาเปลี่ยนรหัส (เพราะเขาไม่มีรหัสในระบบเรา)
    if (req.user.provider !== "LOCAL") {
      return res
        .status(400)
        .json({ message: "Cannot change password for OAuth users." });
    }

    // เรียก Service เพื่อเปลี่ยนรหัส
    const result = await authService.changePassword(
      req.user.id,
      oldPassword,
      newPassword
    );
    res.json(result);
  } catch (error) {
    // จัดการ Error เฉพาะเจาะจง
    if (error.message === "Incorrect old password.") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// -------------------------------------------------------------------
// Get Current User (/me)
// -------------------------------------------------------------------
// ใช้สำหรับเช็คสถานะ Login เมื่อ User รีเฟรชหน้าเว็บ
const getMe = (req, res) => {
  // req.user มีค่าเสมอ ถ้าผ่าน middleware isAuthenticated มาแล้ว
  res.json(authService.getSafeUser(req.user));
};

// -------------------------------------------------------------------
// Google Auth (Start)
// -------------------------------------------------------------------
// เริ่มต้นกระบวนการ OAuth -> Redirect User ไปหน้า Google
const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"], // ขอสิทธิ์เข้าถึง Profile และ Email
});

// -------------------------------------------------------------------
// Google Auth (Callback)
// -------------------------------------------------------------------
// Google ส่ง User กลับมาที่นี่ พร้อม Code
const googleCallback = (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // กรณี Login ไม่ผ่าน (เช่น อีเมลนี้เคยสมัครแบบ Local ไว้แล้ว)
      logger.warn("Google Auth Failed:", info);
      const errorMsg = encodeURIComponent(
        info.message || "Google login failed."
      );
      // Redirect กลับไปหน้า Login ของ Frontend พร้อม Error Message
      return res.redirect(`${process.env.CORS_ORIGIN}/login?error=${errorMsg}`);
    }

    // Login สำเร็จ -> สร้าง Session
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Redirect เข้าสู่หน้า Dashboard
      res.redirect(`${process.env.CORS_ORIGIN}/dashboard`);
    });
  })(req, res, next);
};

// -------------------------------------------------------------------
// Local Registration
// -------------------------------------------------------------------
const register = async (req, res, next) => {
  // Validate Input
  let validatedData;
  try {
    validatedData = registerSchema.parse(req.body);
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Validation failed.", errors: error.errors });
  }

  const { email, password } = validatedData;

  try {
    // เรียก Service เพื่อสร้าง User ใหม่
    const newUser = await authService.registerUser(email, password);

    // *UX Feature* สมัครเสร็จแล้ว Login ให้เลยทันที
    req.logIn(newUser, (err) => {
      if (err) {
        return next(err); // ถ้า Login ไม่ผ่าน (แปลกมาก) ให้ส่ง Error
      }
      // ส่ง 201 Created กลับไป
      res.status(201).json(authService.getSafeUser(newUser));
    });
  } catch (error) {
    // จัดการ Error กรณีอีเมลซ้ำ
    if (error.message.includes("Email address is already in use")) {
      return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    // Other errors
    next(error);
  }
};

module.exports = {
  getCsrfToken,
  loginLocal,
  logout,
  changePassword,
  getMe,
  googleAuth,
  googleCallback,
  register,
};
