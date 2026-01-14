import { defineConfig, env } from "@prisma/config";
import 'dotenv/config'

// console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL ? "YES" : "NO");

export default defineConfig({
  // ระบุตำแหน่งของไฟล์ Schema
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // engine: "classic",
  datasource: {
    // provider: "postgresql", // ต้องระบุ provider ตรงนี้ด้วยในบางเวอร์ชัน หรือระบุใน schema
    url: env("DIRECT_URL"),
  },
});
