/**
 * @class AppError
 * @description คลาสสำหรับจัดการ Operational Errors (Error ที่เรารู้จักและคาดการณ์ไว้)
 * ช่วยให้สามารถระบุ HTTP Status Code และ Message ได้อย่างเป็นระเบียบ
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
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Flag นี้สำคัญมาก! ใช้บอก Error Handler ว่า "นี่คือ Error ที่เราตั้งใจ throw เอง"
    // ทำให้เรากล้าส่ง Message กลับไปหา Client ได้ (ถ้าเป็น false คือ Programming Error เราจะปิดบังไว้)
    this.isOperational = true;

    // เก็บ Stack Trace ไว้ตรวจสอบ (แต่จะไม่แสดงให้ User เห็นใน Production)
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;