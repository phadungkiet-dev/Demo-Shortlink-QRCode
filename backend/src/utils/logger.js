const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

// กำหนด Timezone ให้ตรงกับ System (Asia/Bangkok)
const timezoned = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: process.env.TZ || "Asia/Bangkok",
  });
};

/**
 * Format การแสดงผลของ Log
 * รูปแบบ: [TIMESTAMP] LEVEL: MESSAGE {METADATA}
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: timezoned }),
  winston.format.printf(({ timestamp, level, message, ...args }) => {
    const argsString = Object.keys(args).length
      ? `\n${JSON.stringify(args, null, 2)}` // ถ้ามีข้อมูลเสริม ให้ขึ้นบรรทัดใหม่และ Pretty Print
      : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${argsString}`;
  })
);

/**
 * Logger Instance หลักของระบบ
 * - Development: แสดง Debug Log สีสันสวยงามใน Console
 * - Production: บันทึกลงไฟล์ แยกตามวัน (Rotate) เพื่อประหยัดพื้นที่และดูย้อนหลังได้
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // Console Transport (แสดงผลหน้าจอ)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // ใส่สีตามระดับความรุนแรง
        logFormat
      ),
    }),

    // File Transport (บันทึกลงไฟล์) - ทำ Daily Rotate
    new winston.transports.DailyRotateFile({
      filename: path.join("logs", "app-%DATE%.log"), // เก็บในโฟลเดอร์ logs/
      datePattern: "YYYY-MM-DD",
      zippedArchive: true, // บีบอัดไฟล์เก่าเป็น .gz
      maxSize: "20m", // ขนาดสูงสุดต่อไฟล์ 20MB
      maxFiles: "14d", // เก็บย้อนหลัง 14 วัน (ปรับจาก 90 วัน เพื่อประหยัดที่)
      level: "info", // เก็บตั้งแต่ Info ขึ้นไป
    }),

    // Error File Transport (แยก Error หนักๆ ไว้อีกไฟล์เพื่อง่ายต่อการตรวจสอบ)
    new winston.transports.DailyRotateFile({
      filename: path.join("logs", "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      level: "error", // เก็บเฉพาะ Error เท่านั้น
    }),
  ],
});

/**
 * Logger Adapter สำหรับใช้งานร่วมกับ Morgan (HTTP Request Logger)
 * แปลงข้อความจาก Morgan ให้มาลงที่ Winston แทน Console.log
 */
const loggerAdapter = {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  // Shortcut method ให้เรียกใช้ได้ง่ายๆ เหมือน console.log
  info: (msg, meta) => logger.info(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
  debug: (msg, meta) => logger.debug(msg, meta),
};

module.exports = loggerAdapter;
