const AppError = require("../utils/AppError");
const { USER_ROLES } = require("../config/constants");

/**
 * Middleware: ตรวจสอบว่า User ล็อกอินหรือยัง? (Authentication)
 * หลักการทำงาน:
 * - Passport จะเช็ค Session Cookie ที่ส่งมา
 * - ถ้าถูกต้อง จะ Deserialize User จาก DB มาใส่ใน `req.user`
 * - ถ้า `req.isAuthenticated()` เป็น true แปลว่าผ่าน
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); // ผ่านด่านไปทำรายการต่อ
  }
  // ถ้าไม่ผ่าน ให้ส่ง Error 401 (Unauthorized) กลับไป
  next(new AppError("Unauthorized. Please log in.", 401));
};

/**
 * Middleware: ตรวจสอบว่าเป็น Admin หรือไม่? (Authorization)
 * *ต้องใช้คู่กับ isAuthenticated เสมอ*
 */
const isAdmin = (req, res, next) => {
  // ต้องล็อกอินแล้ว AND ต้องมี Role เป็น ADMIN
  if (req.isAuthenticated() && req.user.role === USER_ROLES.ADMIN) {
    return next();
  }
  // ถ้าล็อกอินแล้วแต่ไม่ใช่ Admin ให้ส่ง 403 (Forbidden - ห้ามเข้า)
  next(new AppError("Forbidden. Admin access required.", 403));
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
