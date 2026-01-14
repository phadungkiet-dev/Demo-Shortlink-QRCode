// [---------- Initial Setup & Configurations ----------]
// Load environment variables first
require("dotenv").config();

// Force Timezone to Asia/Bangkok (or value from .env)
process.env.TZ = process.env.TIMEZONE || "Asia/Bangkok";

// [---------- Import External Libraries ----------]
const express = require("express");
const helmet = require("helmet"); // ความปลอดภัย HTTP Headers (ป้องกัน XSS, Clickjacking)
const cors = require("cors"); // จัดการ Cross-Origin Resource Sharing
const compression = require("compression"); // บีบอัด Response (Gzip) ลดขนาดข้อมูล
const morgan = require("morgan"); // Logger สำหรับ HTTP Requests
const cookieParser = require("cookie-parser"); // แปลง Cookie header เป็น Object
const passport = require("passport"); // Authentication Framework
const path = require("path");

// [---------- Import Internal Modules ----------]
const { prisma } = require("./config/prisma");
const { ROUTES } = require("./config/constants");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler");
const { redirectLimiter } = require("./middlewares/rateLimit");
const initCronJobs = require("./jobs/cron");
const auditLogger = require("./middlewares/auditLogger");
const AppError = require("./utils/AppError");

// Load Passport Strategy (JWT)
require("./config/passport");

// [---------- Import Routes ----------]
const redirectRouter = require("./routes/redirect");
const apiRouter = require("./routes/index"); // รวม API Routes ทั้งหมดไว้ที่นี่

// [---------- Initialize Express App ----------]
const app = express();
const PORT = process.env.PORT || 3001;

// Environment Flags
// ตรวจสอบโหมดการทำงาน (Development/Production)
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const USE_HTTPS = process.env.USE_HTTPS === "true";

// [---------- Security & Core Middlewares Setup ----------]
// Trust Proxy: Required for Cloud Deployment (Render/Nginx) to get real IP
app.set("trust proxy", 1);

// CORS Configuration (Cross-Origin Resource Sharing)
// กำหนดว่า Domain ไหนบ้างที่มีสิทธิ์เรียก API
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",") // รองรับหลาย Domain คั่นด้วย comma (,)
  : ["http://localhost:5173", "http://localhost:3000"]; // Default Local Dev

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // ตรวจสอบว่า origin อยู่ใน whitelist หรือไม่
      if (allowedOrigins.indexOf(origin) === -1) {
        // Log เตือนเมื่อมีการเรียกจาก Domain ที่ไม่อนุญาต (Optional Debugging)
        logger.warn(`Blocked CORS from: ${origin}`);
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // อนุญาตให้ส่ง Cookie/Session ข้าม Domain (สำคัญสำหรับ Auth)
  })
);

// Helmet: Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // อนุญาตให้โหลด Resource ข้ามโดเมน (เช่น รูปภาพ)
    // Content Security Policy (CSP):
    // - Production: เปิดใช้งานเพื่อความปลอดภัยสูงสุด (ต้อง Config ให้ตรงกับ Resource ที่ใช้)
    // - Development: ปิดไว้ก่อนเพื่อความสะดวกในการพัฒนา (Vite HMR อาจโดนบล็อก)
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"], // อนุญาตโหลดรูปจาก https: (เช่น Google Profile)
            connectSrc: ["'self'", "https:"], // อนุญาต connect ไปภายนอก
            upgradeInsecureRequests: [], // ปิดบังคับ HTTPS อัตโนมัติ (ถ้าจัดการ SSL ที่ Gateway)
          },
        }
      : false, // ปิด CSP ใน Dev เพื่อความสะดวกของ Vite
  })
);

// Compression: บีบอัด Response (Gzip)
app.use(compression());

// Logger (Morgan + Winston)
// Define token for local time
morgan.token("date-local", () => {
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
    .replace(",", "");
});

// ใช้ Custom Format แทน "combined" เดิม
// Format เดิมของ combined คือ: :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
// เราจะเปลี่ยน [:date[clf]] เป็น [:date-local]
const morganFormat =
  ':remote-addr - :remote-user [:date-local] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';
// Logging: ต่อท่อ Morgan เข้ากับ Winston Logger
app.use(morgan(morganFormat, { stream: logger.stream }));

// Body Parser Configuration (Dynamic Limit)
const jsonSmall = express.json({ limit: "20kb" }); // สำหรับ Request ทั่วไป
const jsonLarge = express.json({ limit: "5mb" }); // สำหรับ Upload รูปภาพ

const urlencodedSmall = express.urlencoded({ extended: false, limit: "20kb" });
const urlencodedLarge = express.urlencoded({ extended: false, limit: "5mb" });

// Helper: เช็คว่า Route นี้จำเป็นต้องรับไฟล์ใหญ่ไหม?
const shouldAllowLargeBody = (req) => {
  // อนุญาตเฉพาะเส้นทาง /api/links ที่เป็น POST หรือ PATCH (เผื่อการสร้าง/แก้ไขลิงก์พร้อม QR)
  if (
    req.originalUrl.startsWith("/api/links") &&
    ["POST", "PATCH"].includes(req.method)
  ) {
    return true;
  }
  return false;
};

// Middleware: เลือกใช้ Parser ตามเงื่อนไข
app.use((req, res, next) => {
  const parser = shouldAllowLargeBody(req) ? jsonLarge : jsonSmall;
  parser(req, res, next);
});

app.use((req, res, next) => {
  const parser = shouldAllowLargeBody(req) ? urlencodedLarge : urlencodedSmall;
  parser(req, res, next);
});

// [IMPORTANT] Cookie Parser: จำเป็นต้องมีเพื่ออ่าน Refresh Token ที่เป็น HttpOnly Cookie
// process.env.SESSION_SECRET ใช้สำหรับ Signed Cookie (ถ้ามี)
app.use(cookieParser()); // อ่าน Cookie

// [---------- Authentication Middleware (Stateless JWT) ----------]
// Initialize Passport (Authentication)
app.use(passport.initialize());
// เพื่อให้ req.user มีค่าพร้อมใช้งาน
app.use(auditLogger);

// [---------- Route Handling ----------]
// Static Files Route (สำหรับไฟล์รูปภาพที่ Upload)
app.use("/uploads", express.static(path.join(__dirname, "../storage")));

// Redirect Route (Public Access - No CSRF)
// เส้นทางสำหรับลิงก์ย่อ (เช่น /sl/abc1234) ต้องอยู่ก่อน CSRF Protection
// มี Rate Limit แยกต่างหาก (redirectLimiter) เพื่อป้องกัน Abuse
app.use(`/${ROUTES.SHORT_LINK_PREFIX}`, redirectLimiter, redirectRouter);

// Health Check Route
// สำหรับ Monitoring (Render/UptimeRobot) ยิงเช็คสถานะ Server
// ย้ายมาไว้นอก CSRF เพื่อไม่ให้ติด 403 Forbidden
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api", apiRouter);

// [---------- Error Handling & Jobs ----------]
// 404 Not Found Handler (Global)
// จำเป็นต้องมีไว้เพื่อดักจับ Request ที่หลุดรอดจาก Route ทั้งหมด (เช่น /random-path)
app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
// ดักจับ Error ทั้งหมดที่ถูกส่งมาจาก next(err) เพื่อส่ง Response ที่เหมาะสม
app.use(globalErrorHandler);

// [---------- BACKGROUND JOBS ----------]
// Init Cron Jobs (งานเบื้องหลังตามเวลา)
// เช่น ลบลิงก์ Anonymous ที่หมดอายุ
initCronJobs();

// [---------- SERVER STARTUP ----------]
const server = app.listen(PORT, () => {
  logger.info(
    `/ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  logger.info(
    `Security Config: HTTPS=${USE_HTTPS}, SecureCookie=${
      IS_PRODUCTION || USE_HTTPS
    }`
  );
});

// [---------- GRACEFUL SHUTDOWN ----------]
// รองรับการปิด Server เมื่อได้รับสัญญาณ (SIGTERM/SIGINT)
// ปิดรับ Request ใหม่ -> รอ Process จบ -> ปิด DB Connection
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await prisma.$disconnect(); // ปิด Connection Prisma
      logger.info("Database connection closed.");
      process.exit(0);
    } catch (err) {
      logger.error("Error closing DB connection:", err);
      process.exit(1);
    }
  });
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Global Error Catching (Last Resort)
// ดักจับ Error ร้ายแรงที่หลุดรอดจาก Express
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", err);
  process.exit(1); // ต้องปิด Process ทันทีเพื่อความปลอดภัย
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! Shutting down...", err);
  server.close(() => process.exit(1)); // รอ Request จบแล้วค่อยปิด
});

module.exports = app;
