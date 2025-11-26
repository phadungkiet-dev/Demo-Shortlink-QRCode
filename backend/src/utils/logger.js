const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

// กำหนดรูปแบบ Log: [เวลา] ระดับความรุนแรง: ข้อความ {ข้อมูลเสริม}
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...args }) => {
    const argsString = Object.keys(args).length
      ? JSON.stringify(args, null, 2)
      : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${argsString}`;
  })
);

const logger = winston.createLogger({
  // ใน Production จะเก็บแค่ Info ขึ้นไป (ไม่เก็บ Debug) เพื่อประหยัดที่
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // แสดงผลใน Console (เพื่อให้ Developer เห็นตอนรัน)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    // บันทึกลงไฟล์ (สำคัญมากสำหรับ Production)
    // ใช้ DailyRotateFile เพื่อแบ่งไฟล์ตามวัน และลบไฟล์เก่าอัตโนมัติ
    new winston.transports.DailyRotateFile({
      filename: path.join("logs", "app-%DATE%.log"), // เก็บในโฟลเดอร์ logs/
      datePattern: "YYYY-MM-DD",
      zippedArchive: true, // บีบอัดไฟล์เก่าเป็น .gz เพื่อประหยัดพื้นที่
      maxSize: "20m", // ถ้าวันนั้น Log เยอะเกิน 20MB ให้ตัดไฟล์ใหม่
      maxFiles: "90d", // เก็บย้อนหลัง 90 วัน
    }),
  ],
});

// Adapter สำหรับเชื่อมต่อกับ Morgan (HTTP Request Logger) หรือ Code เดิม
const loggerAdapter = {
  info: (message, ...args) => logger.info(message, ...args),
  warn: (message, ...args) => logger.warn(message, ...args),
  error: (message, ...args) => logger.error(message, ...args),
  debug: (message, ...args) => logger.debug(message, ...args),
  // Stream: ฟังก์ชันพิเศษเพื่อให้ Morgan มองเห็น Logger นี้เป็นเหมือน File Stream
  stream: {
    write: (message) => logger.info(message.trim()),
  },
};

module.exports = loggerAdapter;
