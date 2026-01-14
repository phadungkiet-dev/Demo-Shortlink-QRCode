/**
 * [---------- AppError ----------]
 * AppError - Custom Error Class
 * Custom Error Class for handling operational errors (e.g., 404 Not Found, 400 Bad Request)
 * Distinguishes between trusted operational errors and programming bugs.
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP Status Code
   */
  constructor(message, statusCode) {
    // เรียก Constructor ของ Parent Class (Error) เพื่อเซ็ต message
    super(message);

    this.statusCode = statusCode;

    // คำนวณสถานะ (status):
    // - ถ้า code ขึ้นต้นด้วย 4xx -> 'fail' (User ส่งมาผิด)
    // - ถ้าไม่ใช่ (เช่น 5xx) -> 'error' (Server พังเอง)
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    // isOperational = true:
    // เป็น Flag บอก Global Error Handler ว่า "นี่คือ Error ที่เรารู้จักและจัดการได้"
    // (ถ้าเป็น false แปลว่าเป็น Bug ที่ไม่ได้ตั้งใจให้เกิด)
    this.isOperational = true;

    // เก็บ Stack Trace ไว้ตรวจสอบ (มีประโยชน์ตอน Debug ว่า Error เกิดที่บรรทัดไหน)
    // Error.captureStackTrace เป็นฟังก์ชันเฉพาะของ V8 Engine (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
