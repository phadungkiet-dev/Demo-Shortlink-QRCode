// โหลด Enviroment Variables
require("dotenv").config();

// ตั้งค่า Timezone ของ Process ให้เป็นเวลาไทย
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

// --- Import Internal Modules ---
const { prisma } = require("./config/prisma");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler");
const linkService = require("./services/linkService");

// --- Import Routes ---
const redirectRouter = require("./routes/redirect");
const apiRouter = require("./routes/index"); // API routes

// --- Config Passport Strategy ---
require("./config/passport");

// เริ่มต้น Express App
const app = express();
const PORT = process.env.PORT || 3001;

// -------------------------------------------------------------------
// 2. Database Session Store Setup
// -------------------------------------------------------------------
// สร้าง Pool เชื่อมต่อ DB สำหรับเก็บ Session โดยเฉพาะ
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// กำหนดให้ Session ถูกบันทึกลงตาราง 'user_sessions' ใน Database
const sessionStore = new ConnectPgSimple({
  pool: pgPool,
  tableName: "user_sessions", // ข้อควรระวัง: [สร้างโดย prisma เรียบร้อยแล้ว]
  createTableIfMissing: false,
});

// -------------------------------------------------------------------
// 3. Core Middlewares Setup (Pipeline การทำงาน)
// -------------------------------------------------------------------
// CORS: อนุญาตให้ Frontend (ตาม CORS_ORIGIN ใน .env) เรียก API ได้
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true, // อนุญาตให้ส่ง Cookie/Session ข้ามมาได้
  })
);

// Security & Optimization
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
); // ป้องกัน Header Vulnerabilities
app.use(compression()); // ลดขนาด Response Body

// Logging: เชื่อมต่อ Morgan เข้ากับ Winston Logger ที่เราเขียนไว้
app.use(morgan("combined", { stream: logger.stream }));

// Parsing: แปลงข้อมูล Body (JSON/UrlEncoded) ให้อ่านได้
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));

// Session Configuration
const sessionMiddleware = session({
  store: sessionStore, // เก็บลง DB
  secret: process.env.SESSION_SECRET, // กุญแจเข้ารหัส Session ID
  resave: false, // ไม่บันทึกซ้ำถ้าไม่มีอะไรเปลี่ยน (ลด load DB)
  saveUninitialized: false, // ไม่สร้าง Session เปล่าๆ ถ้า User ยังไม่ Login
  rolling: true, // ต่ออายุ Session ทุกครั้งที่ User ใช้งาน
  cookie: {
    httpOnly: true, // JavaScript ฝั่ง Client อ่าน Cookie ไม่ได้ (กัน XSS)
    secure: process.env.NODE_ENV === "production", // ใช้ HTTPS ใน Production เท่านั้น
    maxAge: parseInt(process.env.COOKIE_MAX_AGE_MS || "900000"), // อายุ Session (Default 15 นาที)
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // นโยบายการส่ง Cookie
  },
});
app.use(sessionMiddleware);

// Passport Init: เริ่มระบบยืนยันตัวตน
app.use(passport.initialize());
app.use(passport.session());

// -------------------------------------------------------------------
// 4. Routes Setup
// -------------------------------------------------------------------

// Redirect Route (/r/...)
// *สำคัญ* ต้องอยู่นอก CSRF Protection เพราะเป็น Public Link ที่ใครก็คลิกได้
app.use("/r", redirectRouter);

// Static Files
// เปิดให้เข้าถึงไฟล์รูปภาพ (Logo) ในโฟลเดอร์ storage
app.use("/uploads", express.static(path.join(__dirname, "../storage")));

// API Routes (/api/...)
// *สำคัญ* API ต้องป้องกัน CSRF เพราะมีการรับส่งข้อมูลสำคัญ (Login, Create Link)
const csrfProtection = csurf({ cookie: true });
app.use("/api", csrfProtection, apiRouter);

// -------------------------------------------------------------------
// 5. Error Handling
// -------------------------------------------------------------------
// ดักจับ Error ทั้งหมดที่หลุดรอดมาจาก Controller
app.use(globalErrorHandler);

// -------------------------------------------------------------------
// 6. Background Jobs (Cron)
// -------------------------------------------------------------------
// ทำงานทุกวัน ตอนตี 1 (01:00 น.) เพื่อลบลิงก์ Anonymous ที่หมดอายุ
cron.schedule(
  "0 1 * * *",
  async () => {
    logger.info("Running cron job: Deleting expired anonymous links...");
    try {
      const deletedCount = await linkService.deleteExpiredAnonymousLinks();
      logger.info(
        `Cron job complete: Deleted ${deletedCount} expired anonymous links.`
      );
    } catch (error) {
      logger.error("Error during cron job:", error);
    }
  },
  {
    timezone: "Asia/Bangkok",
  }
);

// -------------------------------------------------------------------
// 7. Start Server
// -------------------------------------------------------------------
app.listen(PORT, () => {
  logger.info(`Server running on ${process.env.BASE_URL}`);
  logger.info(`Timezone set to: ${process.env.TZ}`);
});
