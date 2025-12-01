/**
 * Class: AppError
 * หน้าที่: เป็น Error มาตรฐานของระบบเรา ที่สืบทอดมาจาก Error ปกติของ JS
 * ประโยชน์: ช่วยให้เราระบุได้ว่า Error นี้ "เราตั้งใจให้เกิด" (เช่น กรอกรหัสผิด)
 * หรือ "ระบบพังเอง" (เช่น Database ล่ม)
 */
class AppError extends Error {
  /**
   * @param {string} message - ข้อความแจ้งเตือน Error
   * @param {number} statusCode - รหัส HTTP Status (เช่น 400, 404, 401)
   */
  constructor(message, statusCode) {
    super(message); // เรียก Constructor ของ Parent Class (Error)

    this.statusCode = statusCode;
    // ถ้า Code ขึ้นต้นด้วย 4xx ให้สถานะเป็น 'fail' (User ผิด)
    // ถ้าไม่ใช่ (5xx) ให้เป็น 'error' (Server ผิด)
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    // isOperational = true หมายถึง Error ที่เรารู้จักและคาดการณ์ไว้แล้ว
    // (เอาไว้แยกกับ Error ที่เกิดจาก Bug ของโปรแกรม)
    this.isOperational = true;

    // เก็บ Stack Trace ไว้ตรวจสอบ (แต่จะไม่แสดงให้ User เห็นใน Production)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
