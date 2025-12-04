const logger = require("../utils/logger");

/**
 * Audit Logger Middleware
 * หน้าที่: บันทึกว่า User คนไหน เรียกใช้งาน API อะไร
 * ตำแหน่ง: ต้องวางไว้หลังจาก passport.session() ใน app.js
 */
const auditLogger = (req, res, next) => {
  // ตรวจสอบว่ามี User Login เข้ามาหรือไม่
  if (req.user) {
    const { id, email, role } = req.user;

    // บันทึก Log: [ROLE] Email (ID) -> Method URL
    logger.info(
      `👤 User Access: [${role}] ${email} (${id}) request to ${req.method} ${req.originalUrl}`
    );
  } else {
    // (Optional) ถ้าอยากรู้ว่าคนนอก (Anonymous) เข้ามาทำอะไรบ้าง ให้เปิดบรรทัดนี้
    logger.debug(`👽 Anon Access: ${req.method} ${req.originalUrl}`);
  }

  next(); // ปล่อยให้ทำงานต่อไปยัง Controller
};

module.exports = auditLogger;
