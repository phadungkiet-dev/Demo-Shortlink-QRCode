const passport = require("passport");
const AppError = require("../utils/AppError");
const { USER_ROLES } = require("../config/constants");

/**
 * Middleware: Authentication Guard (JWT)
 * ตรวจสอบ Access Token จาก Header (Authorization: Bearer <token>)
 * หลักการทำงาน:
 * - ใช้ Passport JwtStrategy ตรวจสอบความถูกต้องและวันหมดอายุของ Token
 * - ถ้าผ่าน: แนบ User Object ใส่ req.user แล้วไปต่อ
 * - ถ้าไม่ผ่าน: ส่ง Error 401
 */
const authGuard = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    // 1. Error จาก System/Database
    if (err) {
      return next(err);
    }

    // 2. Token ไม่ถูกต้อง / หมดอายุ / ไม่ส่งมา
    if (!user) {
      // info จะมีรายละเอียด Error ที่ Passport ส่งมา
      // เช่น name: "TokenExpiredError", message: "jwt expired"
      let errorMessage = "Unauthorized. Please log in.";

      if (info) {
        if (info.name === "TokenExpiredError") {
          errorMessage = "Token expired"; // Keyword สำคัญให้ Frontend จับเพื่อ Refresh Token
        } else if (info.message) {
          errorMessage = info.message;
        }
      }

      return next(new AppError(errorMessage, 401));
    }

    // 3. ผ่าน -> แนบ User เข้า Request
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Middleware: Authorization Guard (Admin Only)
 * *ต้องใช้ต่อจาก authGuard เสมอ*
 */
const adminGuard = (req, res, next) => {
  // ตรวจสอบว่ามี req.user (จากการ Login) และ Role เป็น ADMIN หรือไม่
  if (req.user && req.user.role === USER_ROLES.ADMIN) {
    return next();
  }

  // ถ้าไม่ใช่ Admin
  next(new AppError("Forbidden. Admin access required.", 403));
};

module.exports = {
  authGuard,
  adminGuard,
};
