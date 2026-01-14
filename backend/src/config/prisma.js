const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

// [---------- Database Connection Setup (Runtime) ----------]
// [DATABASE CONNECTION SETUP]
// Validate Environment Variable
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is missing in .env");
  process.exit(1);
}

// Connection String (Transaction Pooler - Port 6543)
const connectionString = process.env.DATABASE_URL;

// Create PostgreSQL Connection Pool
const pool = new Pool({
  connectionString,
  // ตั้งค่า Pool Size ให้เหมาะสม (Supabase Pooler)
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
      ? ["query", "error", "warn"] // Dev: Show detailed logs
      : ["error"], // Prod: Errors only
});

module.exports = { prisma };
