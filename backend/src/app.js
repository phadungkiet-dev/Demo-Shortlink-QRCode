// -------------------------------------------------------------------
// Initial Setup & Configurations
// -------------------------------------------------------------------
require("dotenv").config();

// บังคับ Timezone ให้เป็นเวลาไทย (Asia/Bangkok) เสมอ เพื่อความถูกต้องของ Logs และ Cron Jobs
// ถ้าไม่มีค่าใน .env จะใช้ 'Asia/Bangkok' เป็น Default
process.env.TZ = process.env.TIMEZONE || "Asia/Bangkok";

// Import External Libraries
const express = require("express");
const helmet = require("helmet"); // ความปลอดภัย HTTP Headers (ป้องกัน XSS, Clickjacking)
const cors = require("cors"); // จัดการ Cross-Origin Resource Sharing
const compression = require("compression"); // บีบอัด Response (Gzip) ลดขนาดข้อมูล
const morgan = require("morgan"); // Logger สำหรับ HTTP Requests
const cookieParser = require("cookie-parser"); // แปลง Cookie header เป็น Object
const session = require("express-session"); // ระบบ Session Management
const passport = require("passport"); // Authentication Framework
const csurf = require("csurf"); // ป้องกัน Cross-Site Request Forgery (CSRF)
const path = require("path");
const pg = require("pg"); // PostgreSQL Client
const ConnectPgSimple = require("connect-pg-simple")(session); // Adapter เก็บ Session ลง Postgres

// Import Internal Modules
const { prisma } = require("./config/prisma");
const { COOKIE, ROUTES } = require("./config/constants");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler");
const { redirectLimiter } = require("./middlewares/rateLimit");
const initCronJobs = require("./jobs/cron");
const auditLogger = require("./middlewares/auditLogger");

// Load Passport Configuration (Strategy Setup)
require("./config/passport");

// Import Routes
const redirectRouter = require("./routes/redirect");
const apiRouter = require("./routes/index"); // รวม API Routes ทั้งหมดไว้ที่นี่

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3001;

// --- Environment Flags ---
// ตรวจสอบโหมดการทำงาน (Production/Development)
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const USE_HTTPS = process.env.USE_HTTPS === "true";

// -------------------------------------------------------------------
// Database & Session Store Configuration
// -------------------------------------------------------------------
// เชื่อมต่อ PostgreSQL
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// กำหนดให้เก็บ Session ลงในฐานข้อมูล (Table: user_sessions)
const sessionStore = new ConnectPgSimple({
  pool: pgPool,
  tableName: "user_sessions", // ข้อควรระวัง: [สร้างโดย prisma เรียบร้อยแล้ว]
  createTableIfMissing: false, // Prisma จัดการเรื่อง Schema แล้ว
});

// -------------------------------------------------------------------
// Security & Core Middlewares Setup
// -------------------------------------------------------------------
// Trust Proxy Configuration
// จำเป็นมากเมื่อ Deploy บน Cloud (Render/Heroku/Nginx)
// เพื่อให้ Express ได้ IP จริงของ User และรู้ Protocol (http/https) ที่ถูกต้อง
app.set("trust proxy", 1);

// CORS Configuration (Cross-Origin Resource Sharing)
// กำหนดว่า Domain ไหนบ้างที่มีสิทธิ์เรียก API
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",") // รองรับหลาย Domain คั่นด้วย comma (,)
  : ["http://localhost:5173"]; // Default Local Dev

app.use(
  cors({
    origin: (origin, callback) => {
      // อนุญาต request ที่ไม่มี origin (เช่น Server-to-Server, Mobile App, curl)
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

// กำหนด Token 'date-local' ให้ Morgan ใช้เวลาตามเครื่อง (ซึ่งเราตั้ง TZ เป็น Asia/Bangkok ไว้แล้ว)
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

// Body Parser: แปลง Request Body
app.use(express.json({ limit: "10mb" })); // รองรับ JSON (เพิ่ม Limit เผื่อส่งรูป Base64)
app.use(express.urlencoded({ extended: false, limit: "10mb" })); // รองรับ Form Data
app.use(cookieParser(process.env.SESSION_SECRET)); // อ่าน Cookie

// -------------------------------------------------------------------
// Session & Authentication Middleware
// -------------------------------------------------------------------
// Cookie Configuration Object
// ใช้ร่วมกันทั้ง Session และ CSRF เพื่อความสม่ำเสมอ
const cookieConfig = {
  httpOnly: true, // JavaScript เข้าถึงไม่ได้ (ป้องกัน XSS ขโมย Session)
  // Secure:
  // - Production (Render): ต้องเป็น true เสมอ (Render บังคับ HTTPS)
  // - Development: false (http://localhost)
  secure: IS_PRODUCTION || USE_HTTPS,
  // SameSite:
  // - 'none': จำเป็นสำหรับการส่ง Cookie ข้ามโดเมน (Vercel -> Render)
  // - 'lax': ใช้สำหรับ Localhost หรือ Domain เดียวกัน
  sameSite: IS_PRODUCTION ? "none" : "lax",
  maxAge: parseInt(process.env.COOKIE_MAX_AGE_MS || COOKIE.MAX_AGE), // อายุ Session
  domain:
    IS_PRODUCTION && process.env.COOKIE_DOMAIN
      ? process.env.COOKIE_DOMAIN
      : undefined,
};

// Session Middleware
app.use(
  session({
    name: COOKIE.NAME,
    store: sessionStore, // เก็บ Session ลง DB
    secret: process.env.SESSION_SECRET, // Key สำหรับเข้ารหัส Session ID
    resave: false, // ไม่บันทึกซ้ำถ้าไม่มีการเปลี่ยนแปลง (ลดโหลด DB)
    saveUninitialized: false, // ไม่สร้าง Session จนกว่าจะมีข้อมูล (Login)
    rolling: true, // ต่ออายุ Session ทุกครั้งที่มีการใช้งาน (User ไม่เด้งออก)
    proxy: true, // จำเป็นสำหรับการทำงานหลัง Proxy (Render/Nginx)
    cookie: cookieConfig,
  })
);

// Initialize Passport (Authentication)
app.use(passport.initialize());
app.use(passport.session());
// เพื่อให้ req.user มีค่าพร้อมใช้งาน
app.use(auditLogger);

// -------------------------------------------------------------------
// Route Handling
// -------------------------------------------------------------------

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

// API Routes (Protected with CSRF)
// เส้นทาง API ทั้งหมด (/api/*) จะถูกป้องกันด้วย CSRF Token
const csrfProtection = csurf({
  cookie: {
    ...cookieConfig, // ใช้ Config เดียวกับ Session
    key: COOKIE.SECRET_KEY,
  },
});

app.use("/api", csrfProtection, apiRouter);

// -------------------------------------------------------------------
// Error Handling & Jobs
// -------------------------------------------------------------------
// 404 Not Found Handler (Global)
// จำเป็นต้องมีไว้เพื่อดักจับ Request ที่หลุดรอดจาก Route ทั้งหมด (เช่น /random-path)
const AppError = require("./utils/AppError");
app.all(/.*/, (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
// ดักจับ Error ทั้งหมดที่ถูกส่งมาจาก next(err) เพื่อส่ง Response ที่เหมาะสม
app.use(globalErrorHandler);

// Init Cron Jobs (งานเบื้องหลังตามเวลา)
// เช่น ลบลิงก์ Anonymous ที่หมดอายุ
initCronJobs();

// -------------------------------------------------------------------
// Server Start & Graceful Shutdown
// -------------------------------------------------------------------
const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  logger.info(
    `🔒 Security Config: HTTPS=${USE_HTTPS}, SecureCookie=${cookieConfig.secure}, SameSite=${cookieConfig.sameSite}`
  );
});

// Graceful Shutdown Logic
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
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1); // ต้องปิด Process ทันทีเพื่อความปลอดภัย
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
  server.close(() => process.exit(1)); // รอ Request จบแล้วค่อยปิด
});

module.exports = app;
