const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Prisma Client Instance
// -------------------------------------------------------------------
// เราสร้าง Instance เดียวแล้ว Export ไปใช้ทั่วทั้งแอป (Singleton โดยธรรมชาติของ Node.js Module Caching)
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"] // Dev: ดู Query SQL ได้เพื่อ Debug
      : ["error"], // Prod: ดูแค่ Error พอ (ประหยัด Log Space)
});

module.exports = { prisma };
