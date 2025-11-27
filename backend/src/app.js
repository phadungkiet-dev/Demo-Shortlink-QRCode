// -------------------------------------------------------------------
// Init & Config
// -------------------------------------------------------------------
require("dotenv").config();

// บังคับ Timezone ให้เป็นเวลาไทย (สำคัญสำหรับ Cron Job และ Log)
process.env.TZ = process.env.TIMEZONE || "Asia/Bangkok";

const express = require("express");
const helmet = require("helmet"); // เพิ่ม Security Headers
const cors = require("cors"); // จัดการ Cross-Origin Resource Sharing
const compression = require("compression"); // บีบอัด Response (Gzip) ให้โหลดเร็วขึ้น
const morgan = require("morgan"); // Logger (บันทึก Request ที่เข้ามา)
const cookieParser = require("cookie-parser");
const session = require("express-session"); // จัดการ Session ฝั่ง Server
const passport = require("passport"); // Authentication Middleware
const csurf = require("csurf"); // ป้องกัน CSRF Attack
const cron = require("node-cron"); // ตั้งเวลาทำงานอัตโนมัติ (Cron Job)
const path = require("path");
const pg = require("pg");
const ConnectPgSimple = require("connect-pg-simple")(session); // ตัวเก็บ Session ลง PostgreSQL

// Internal Modules
const { prisma } = require("./config/prisma");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler");
const linkService = require("./services/linkService");

// Load Passport Config (เพื่อให้ Strategy ทำงาน)
require("./config/passport");

// Routes
const redirectRouter = require("./routes/redirect");
const apiRouter = require("./routes/index"); // API routes

// เริ่มต้น Express App
const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// -------------------------------------------------------------------
// Database & Session Store Setup
// -------------------------------------------------------------------
// ใช้ Connection Pool แยกสำหรับ Session Store เพื่อประสิทธิภาพ
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// กำหนดให้ Session ถูกบันทึกลงตาราง 'user_sessions' ใน Database
const sessionStore = new ConnectPgSimple({
  pool: pgPool,
  tableName: "user_sessions", // ข้อควรระวัง: [สร้างโดย prisma เรียบร้อยแล้ว]
  createTableIfMissing: false, // เราใช้ Prisma สร้างตารางแล้ว
});

// -------------------------------------------------------------------
// Security & Core Middlewares
// -------------------------------------------------------------------

// CORS: อนุญาตให้ Frontend ส่ง Cookie มาได้ (credentials: true)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN, // e.g., http://localhost:5173
    credentials: true, // อนุญาตให้ส่ง Cookie/Session ข้ามมาได้
  })
);

// Helmet: ปรับ Policy ให้โหลดรูปจากภายนอกได้ (เช่น Logo QR)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Compression: บีบอัด Response (Gzip)
app.use(compression());

// Logging: ต่อท่อ Morgan เข้ากับ Winston Logger
app.use(morgan("combined", { stream: logger.stream }));

// Parsing: แปลง Body
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));

// -------------------------------------------------------------------
// Session & Auth Setup
// -------------------------------------------------------------------
app.use(
  session({
    store: sessionStore, // เก็บลง DB
    secret: process.env.SESSION_SECRET, // กุญแจเข้ารหัส Session ID
    resave: false, // ไม่บันทึกซ้ำถ้าไม่มีอะไรเปลี่ยน (ลด load DB)
    saveUninitialized: false, // ไม่สร้าง Session เปล่าถ้ายังไม่ Login
    rolling: true, // ต่ออายุ Session ทุกครั้งที่มีการใช้งาน
    cookie: {
      httpOnly: true, // ป้องกัน JS ฝั่ง Client เข้าถึง Cookie (กัน XSS)
      secure: IS_PRODUCTION, // Production บังคับใช้ HTTPS
      maxAge: parseInt(process.env.COOKIE_MAX_AGE_MS || "900000"), // 15 นาที
      sameSite: IS_PRODUCTION ? "lax" : "lax", // Policy การส่ง Cookie
    },
  })
);

// Passport Init: เริ่มระบบยืนยันตัวตน
app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------------------------------------
// Routes Setup
// -------------------------------------------------------------------

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "../storage")));

// Redirect Route (Public - No CSRF)
// *ต้องอยู่ก่อน CSRF Protection*
app.use("/r", redirectRouter);

// API Routes (Protected with CSRF)
const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "lax" : "lax",
  },
});

app.use("/api", csrfProtection, apiRouter);

// -------------------------------------------------------------------
// Global Error Handling
// -------------------------------------------------------------------
// ดักจับ Error ทั้งหมดที่ไม่ได้ Handle ใน Controller
app.use(globalErrorHandler);

// -------------------------------------------------------------------
// Background Jobs (Cron)
// -------------------------------------------------------------------
// ลบลิงก์ Anonymous ที่หมดอายุ ทุกตี 1
cron.schedule(
  "0 1 * * *",
  async () => {
    logger.info("Cron Job: Cleaning expired links...");
    try {
      const count = await linkService.deleteExpiredAnonymousLinks();
      logger.info(`Cron Job: Deleted ${count} links.`);
    } catch (error) {
      logger.error("Cron Job Failed:", error);
    }
  },
  { timezone: "Asia/Bangkok" }
);

// -------------------------------------------------------------------
// Server Start & Graceful Shutdown
// -------------------------------------------------------------------
const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
});

// Graceful Shutdown: ปิด Server อย่างนุ่มนวล
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Closing server...`);

  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await prisma.$disconnect(); // ปิด DB Connection
      logger.info("Database connection closed.");
      process.exit(0);
    } catch (err) {
      logger.error("Error closing DB connection:", err);
      process.exit(1);
    }
  });
};

// รับสัญญาณปิดโปรแกรม
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ดักจับ Error ร้ายแรงที่หลุดรอด
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
  server.close(() => process.exit(1));
});

module.exports = app;
