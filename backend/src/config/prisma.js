const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

// สร้าง Instance ของ Prisma Client
// log: แสดง Query ใน Console เฉพาะตอน Dev เพื่อ Debug
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

module.exports = { prisma };
