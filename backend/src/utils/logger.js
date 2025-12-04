const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");
const fs = require("fs");

// สร้างโฟลเดอร์ logs ถ้ายังไม่มี
const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// กำหนด Timezone ให้ตรงกับ System (Asia/Bangkok)
const timezoned = () => {
  return new Date()
    .toLocaleString("en-CA", {
      timeZone: process.env.TZ || "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", ""); // ลบลูกน้ำออก (บาง Environment อาจมี)
};

/**
 * Custom Format สำหรับการแสดงผล
 * รองรับการปริ้น Stack Trace กรณีเกิด Error
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: timezoned }),
  winston.format.errors({ stack: true }), // ให้ Winston จัดการ Error Stack Trace
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // ถ้ามี Stack Trace (กรณี Error) ให้แสดง Stack แทน Message ปกติ
    const logMessage = stack || message;

    // ถ้ามี Metadata อื่นๆ (เช่น Object ที่แนบมา) ให้ Pretty Print ต่อท้าย
    const metaString = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";

    return `[${timestamp}] ${level.toUpperCase()}: ${logMessage} ${metaString}`;
  })
);

/**
 * Logger Instance
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // Console: แสดงผลหน้าจอ (มีสี)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),

    // File: บันทึกทุกอย่างลงไฟล์ (Rotate รายวัน)
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),

    // Error File: แยก Error หนักๆ ไว้อีกไฟล์ (หาง่ายเวลาเว็บล่ม)
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: false,
      maxSize: "20m",
      maxFiles: "30d", // เก็บ Error ไว้นานหน่อย (1 เดือน)
      level: "error",
    }),
  ],
});

/**
 * Logger Adapter สำหรับ Morgan และการเรียกใช้ทั่วไป
 */
const loggerAdapter = {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  info: (msg, meta) => logger.info(msg, meta),
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
  debug: (msg, meta) => logger.debug(msg, meta),
};

module.exports = loggerAdapter;
