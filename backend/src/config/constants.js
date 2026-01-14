module.exports = {
  // [---------- User Roles ----------]
  USER_ROLES: {
    ADMIN: "ADMIN",
    USER: "USER",
  },
  // [---------- Routes Configuration ----------]
  ROUTES: {
    SHORT_LINK_PREFIX: "sl", // Prefix ของลิงก์ย่อ (เช่น domain.com/sl/xxxx)
  },
  // [---------- Security Constants ----------]
  SECURITY: {
    SALT_ROUNDS: 10, // ความยากในการ Hash Password (Bcrypt)
  },
  // [---------- Authentication & Cookies (JWT System) ----------]
  AUTH: {
    // ชื่อ Cookie ที่ใช้เก็บ Refresh Token (HttpOnly)
    REFRESH_COOKIE_NAME: "shortlink_refresh_token",
  },
  // [---------- System Defaults ----------]
  DEFAULTS: {
    LINK_LIMIT: 10, // ผู้ใช้ทั่วไปสร้างได้ไม่เกิน 10 ลิงก์
    // อายุ links
    ANON_LINK_EXPIRY_DAYS: 7, // Guest: 7 วัน
    USER_LINK_EXPIRY_DAYS: 30, // Member: 30 วัน
    // Slug Configuration
    SLUG_SIZE: 7, // ขนาดความยาวของ Slug (Default)
    SLUG_RETRIES: 5, // จำนวนครั้งที่ลองสุ่มใหม่ถ้าซ้ำ
    // Reset Password Token อายุ 1 ชั่วโมง
    PASSWORD_RESET_EXPIRY_MS: 60 * 60 * 1000,
  },
  // [---------- File Storage ----------]
  STORAGE: {
    LOCAL_PATH: "storage/logos",
    MAX_FILE_SIZE: 1 * 1024 * 1024, // 1MB (1 * 1024KB * 1024Bytes)
  },
  // [---------- Rate Limiting (Anti-Spam/DDoS) ----------]
  RATE_LIMIT: {
    // สร้างลิงก์ (POST /api/links)
    CREATE: {
      WINDOW_MS: 60 * 60 * 1000, // 1 hour
      MAX_DEV: 1000,
      MAX_PROD: 5, // Guest: สร้างได้ 5 link/hour (Member ไม่โดนจำกัดตรงนี้)
    },
    // API ทั่วไป (Global)
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 min
      MAX_DEV: 5000,
      MAX_PROD: 200, // 200 Requests (เฉลี่ย 13 req/นาที)
    },
    // Redirect Link (/sl/:slug) - ต้องรองรับ Traffic เยอะๆ
    REDIRECT: {
      WINDOW_MS: 1 * 60 * 1000, // 1 min
      MAX_DEV: 10000,
      MAX_PROD: 600, // Prod: 600 ครั้ง/นาที (เฉลี่ย 10 req/วิ)
    },
  },
  // [---------- Validation Rules (Zod) ----------]
  VALIDATION: {
    PASSWORD_MIN_LEN: 8,
    SLUG_MIN_LEN: 3, // link สั้นสุด
    SLUG_MAX_LEN: 30, // link ยาวสุด
  },
  // [---------- Cron Jobs ----------]
  CRON: {
    // รันตอนตี 1 ของทุกวัน (01:00 AM)
    CLEANUP_SCHEDULE: "0 1 * * *",
  },
};
