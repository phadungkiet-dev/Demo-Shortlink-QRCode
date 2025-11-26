const rateLimit = require("express-rate-limit");

// 1. Limiter สำหรับการ "สร้างลิงก์" (เข้มงวดกับคนแปลกหน้า)
const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // กรอบเวลา 1 ชั่วโมง
  max: 5, // อนุญาตสูงสุด 5 Request ต่อ IP
  message: {
    message:
      "Too many links created from this IP. Please wait 1 hour or log in.",
  },
  // ฟังก์ชัน handler มาตรฐานเมื่อเกิน Limit
  handler: (req, res, next, options) => {
    res.status(options.statusCode).send(options.message);
  },
  // *จุดสำคัญ* ถ้า User Login แล้ว (req.isAuthenticated() เป็น true)
  // ให้ "ข้าม" (Skip) การนับ Limit นี้ไปเลย -> สมาชิกสร้างได้ไม่จำกัด
  skip: (req, res) => req.isAuthenticated(),
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // กรอบเวลา 15 นาที
  max: 100, // อนุญาต 100 Request
  message: { message: "Too many requests. Please wait 15 minutes." },
});

module.exports = {
  createLinkLimiter,
  apiLimiter,
};
