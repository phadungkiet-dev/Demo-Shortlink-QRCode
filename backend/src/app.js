// -------------------------------------------------------------------
// Init & Config (เริ่มต้นระบบและโหลดค่าคอนฟิก)
// -------------------------------------------------------------------
require("dotenv").config();

// บังคับ Timezone ให้เป็นเวลาไทย
process.env.TZ = process.env.TIMEZONE || "Asia/Bangkok";

const express = require("express");
const helmet = require("helmet"); // ความปลอดภัย HTTP Headers (ป้องกัน XSS, Clickjacking)
const cors = require("cors"); // อนุญาตให้ Frontend ข้าม Domain มาเรียกได้
const compression = require("compression"); // บีบอัด Response (Gzip) ให้โหลดเร็วขึ้น
const morgan = require("morgan"); // ตัว Log Request ที่เข้ามา (Access Log)
const cookieParser = require("cookie-parser");
const session = require("express-session"); // จัดการ Session ฝั่ง Server
const passport = require("passport"); // Authentication Middleware
const csurf = require("csurf"); // ป้องกัน CSRF Attack
const path = require("path");
const pg = require("pg");
const ConnectPgSimple = require("connect-pg-simple")(session); // ตัวเก็บ Session ลง PostgreSQL

// Internal Modules
const { prisma } = require("./config/prisma");
const { COOKIE, ROUTES } = require("./config/constants");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler");
const { apiLimiter, redirectLimiter } = require("./middlewares/rateLimit");
const initCronJobs = require("./jobs/cron");

// Load Passport Config (เพื่อให้ Strategy ทำงาน)
require("./config/passport");

// Routes
const redirectRouter = require("./routes/redirect");
const apiRouter = require("./routes/index"); // API routes

// เริ่มต้น Express App
const app = express();
const PORT = process.env.PORT || 3001;

// --- Environment Flags ---
// เช็คว่าเป็น Production หรือ Development เพื่อปรับพฤติกรรมความปลอดภัย
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const USE_HTTPS = process.env.USE_HTTPS === "true";

// -------------------------------------------------------------------
// Centralized Cookie Configuration (ใช้ร่วมกันทั้ง Session และ CSRF)
// -------------------------------------------------------------------
const cookieConfig = {
  httpOnly: true,
  secure: IS_PRODUCTION && USE_HTTPS,
  sameSite: IS_PRODUCTION ? "lax" : "lax",
  maxAge: parseInt(process.env.COOKIE_MAX_AGE_MS || COOKIE.MAX_AGE),
  domain:
    IS_PRODUCTION && process.env.COOKIE_DOMAIN
      ? process.env.COOKIE_DOMAIN
      : undefined,
};

// -------------------------------------------------------------------
// Database & Session Store Setup
// -------------------------------------------------------------------
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// กำหนดให้ Session ถูกบันทึกลงตาราง 'user_sessions' ใน Database
const sessionStore = new ConnectPgSimple({
  pool: pgPool,
  tableName: "user_sessions", // ข้อควรระวัง: [สร้างโดย prisma เรียบร้อยแล้ว]
  createTableIfMissing: false, // ใช้ Prisma สร้างตารางแล้ว
});

// -------------------------------------------------------------------
// Security & Core Middlewares
// -------------------------------------------------------------------

// Trust Proxy: จำเป็นมากเมื่อรันหลัง Nginx, Cloudflare หรือ Docker Load Balancer
// เพื่อให้ Express รู้จัก IP จริงของผู้ใช้ และรู้ว่าผ่าน HTTPS มาหรือไม่
app.set("trust proxy", 1);

// CORS: รองรับหลาย Origin (แยกด้วยเครื่องหมาย ,)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // ตรวจสอบว่า origin อยู่ใน whitelist ที่เราตั้งไว้ไหม
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true, // อนุญาตให้ส่ง Cookie/Session ข้าม Domain
  })
);

// Helmet: Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // [Config] Content Security Policy (CSP)
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            // อนุญาตให้โหลด Script/Style จากตัวเองและ Inline (จำเป็นสำหรับ Vue/Tailwind บางส่วน)
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            // [สำคัญ] อนุญาตโหลดรูปจาก https: (เช่น Google Favicon, User Profile Image)
            imgSrc: ["'self'", "data:", "https:"],
            // อนุญาตให้เชื่อมต่อ API ภายนอกได้ (ถ้ามี)
            connectSrc: ["'self'", "https:"],
            upgradeInsecureRequests: [], // ปิดบังคับ HTTPS ถ้าเราจัดการ SSL ที่ Gateway
          },
        }
      : false, // ปิด CSP ใน Dev เพื่อความสะดวกของ Vite
  })
);

// Compression: บีบอัด Response (Gzip)
app.use(compression());

// Logging: ต่อท่อ Morgan เข้ากับ Winston Logger
app.use(morgan("combined", { stream: logger.stream }));

// Parsing: แปลง Body
app.use(express.json({ limit: "10kb" })); // อ่าน JSON body
app.use(express.urlencoded({ extended: false, limit: "10kb" })); // อ่าน Form body
app.use(cookieParser(process.env.SESSION_SECRET)); // อ่าน Cookie

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
    proxy: true, // จำเป็นสำหรับ Secure Cookie หลัง Nginx
    cookie: cookieConfig, // ใช้ Config กลางที่เราประกาศไว้
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
app.use(`/${ROUTES.SHORT_LINK_PREFIX}`, redirectLimiter, redirectRouter);

// Health Check: ย้ายมาตรงนี้เพื่อให้ Cloud Service (Render/Fly.io) ยิง Ping ตรวจสอบได้
// โดยไม่ต้องติด CSRF Token (ถ้าติด 403 Deploy จะไม่ผ่าน)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
    uptime: process.uptime(),
  });
});

// API Routes (Protected with CSRF)
const csrfProtection = csurf({
  cookie: {
    ...cookieConfig,
    key: COOKIE.SECRET_KEY,
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
initCronJobs();

// -------------------------------------------------------------------
// Server Start & Graceful Shutdown
// -------------------------------------------------------------------
const server = app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
  );
  logger.info(
    `🔒 Security: HTTPS=${USE_HTTPS}, SecureCookie=${cookieConfig.secure}`
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
