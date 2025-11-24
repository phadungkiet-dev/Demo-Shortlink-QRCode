// backend/src/utils/logger.js

const winston = require("winston");
require("winston-daily-rotate-file");
const path = require("path");

// กำหนดรูปแบบ Log: [Timestamp] LEVEL: Message {args}
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
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // 1. แสดงผลใน Console (เพื่อดูขณะรัน)
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    // 2. บันทึกลงไฟล์ (รวมทั้ง Info และ Error) แบ่งไฟล์รายวัน เก็บ 90 วัน
    new winston.transports.DailyRotateFile({
      filename: path.join("logs", "app-%DATE%.log"), // ชื่อไฟล์ เช่น logs/app-2023-10-27.log
      datePattern: "YYYY-MM-DD",
      zippedArchive: true, // บีบอัดไฟล์เก่าเป็น .gzip
      maxSize: "20m", // ขนาดสูงสุดต่อไฟล์ก่อนตัดไฟล์ใหม่ (ถ้าวันนั้น log เยอะมาก)
      maxFiles: "90d", // เก็บย้อนหลัง 90 วัน
    }),
  ],
});

// Adapter เพื่อให้โค้ดเดิมที่เรียกใช้ logger.info(...) ทำงานได้ต่อทันที
const loggerAdapter = {
  info: (message, ...args) => logger.info(message, ...args),
  warn: (message, ...args) => logger.warn(message, ...args),
  error: (message, ...args) => logger.error(message, ...args),
  debug: (message, ...args) => logger.debug(message, ...args),
  // Stream สำหรับ Morgan (HTTP Logger)
  stream: {
    write: (message) => logger.info(message.trim()),
  },
};

module.exports = loggerAdapter;
