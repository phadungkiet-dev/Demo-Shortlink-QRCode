/**
 * ============================================================================
 * AppError - Custom Error Class
 * ============================================================================
 * หน้าที่: เป็น Error Object มาตรฐานของระบบที่สืบทอดมาจาก Error ปกติของ JS
 * ประโยชน์:
 * 1. ใช้ส่ง HTTP Status Code ได้ (เช่น 404, 400)
 * 2. ระบุได้ว่าเป็น "Operational Error" (Error ที่เราคาดการณ์ไว้ เช่น กรอกผิด)
 * เพื่อแยกออกจาก "Programming Error" (Bug ของระบบ)
 */
class AppError extends Error {
  /**
   * @param {string} message - ข้อความแจ้งเตือน Error
   * @param {number} statusCode - รหัส HTTP Status (เช่น 400, 404, 401)
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
