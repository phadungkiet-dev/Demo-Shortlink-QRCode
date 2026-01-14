const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

// [---------- Database Connection Setup (Runtime) ----------]
// อ่านค่า DATABASE_URL (Transaction Pooler - Port 6543) จาก .env
// ต้องมั่นใจว่า process.env.DATABASE_URL มีค่าอยู่จริง
const connectionString = process.env.DATABASE_URL;

// สร้าง PostgreSQL Connection Pool
const pool = new Pool({
  connectionString,
  // ตั้งค่า Pool Size ให้เหมาะสม (Supabase Pooler จัดการให้แล้ว ไม่ต้องตั้งเยอะ)
  max: 10,
});

// สร้าง Adapter สำหรับ Prisma
const adapter = new PrismaPg(pool);

// [---------- Prisma Client Instance (Singleton) ----------]
const prisma = new PrismaClient({
  // ส่ง adapter เข้าไปเพื่อให้ Prisma ใช้ connection ของ pg แทน engine ในตัว
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"] // Dev: เห็น Query
      : ["error"], // Prod: เห็นแค่ Error
});

module.exports = { prisma };
