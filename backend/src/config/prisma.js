const { PrismaClient } = require("@prisma/client");

// -------------------------------------------------------------------
// Prisma Client Instance
// -------------------------------------------------------------------
// เราสร้าง Instance เดียวแล้ว Export ไปใช้ทั่วทั้งแอป (Singleton Pattern)
// Node.js จะ Cache module นี้ไว้ ทำให้การเรียก require ซ้ำๆ จะได้ object เดิมเสมอ
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"] // Dev: แสดง Query เพื่อ Debug
      : ["error"], // Prod: แสดงเฉพาะ Error (ลด Noise ใน Log)
});

module.exports = { prisma };
