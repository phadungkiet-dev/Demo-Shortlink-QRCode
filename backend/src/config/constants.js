module.exports = {
  // --- สิทธิ์ผู้ใช้งาน (User Roles) ---
  // ใช้กำหนดสิทธิ์เข้าถึง (Authorization) ใน Middleware 'isAdmin'
  USER_ROLES: {
    ADMIN: "ADMIN",
    USER: "USER",
  },
  // --- การตั้งค่าเส้นทาง (Routes Configuration) ---
  ROUTES: {
    SHORT_LINK_PREFIX: "sl", // กำหนด Prefix ของ Shortlink ที่นี่ที่เดียว!
  },
  // --- ค่าเริ่มต้นของระบบ (System Defaults) ---
  DEFAULTS: {
    LINK_LIMIT: 10, // ผู้ใช้ทั่วไปสร้างได้ไม่เกิน 10 ลิงก์ (ป้องกัน DB บวม)
    ANON_LINK_EXPIRY_DAYS: 7, // ลิงก์จากคนไม่ล็อกอิน อยู่ได้ 7 วัน
    USER_LINK_EXPIRY_DAYS: 30, // ลิงก์จากสมาชิก อยู่ได้ 30 วัน
  },
  // --- การตั้งค่า Cookie & Session ---
  COOKIE: {
    NAME: "connect.sid", // ชื่อ Cookie ที่จะฝังใน Browser
    SECRET_KEY: "_csrf", // ชื่อ Cookie สำหรับ CSRF Token
    MAX_AGE: 900000, // 15 นาที (หน่วย Milliseconds) - Session หลุดถ้าไม่ใช้งาน
  },
  // --- การจัดการไฟล์ (Storage) ---
  STORAGE: {
    LOCAL_PATH: "storage/logos",
    MAX_FILE_SIZE: 1 * 1024 * 1024, // 1MB (คำนวณให้เห็นชัดๆ: 1 * 1024KB * 1024Bytes)
  },
  // --- Rate Limiting (ป้องกัน Spam/DDoS) ---
  RATE_LIMIT: {
    // กฎสำหรับการสร้างลิงก์ (เข้มงวดหน่อย)
    CREATE: {
      WINDOW_MS: 60 * 60 * 1000, // ภายใน 1 ชั่วโมง
      MAX_DEV: 1000, // Dev: สร้างได้รัวๆ ไว้เทส
      MAX_PROD: 5, // Prod: อนุญาตแค่ 5 ลิงก์ (สำหรับ Anonymous) กัน spam
    },
    // กฎสำหรับ API ทั่วไป (เช่น Login, Get Links)
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000, // ภายใน 15 นาที
      MAX_DEV: 5000,
      MAX_PROD: 200, // 200 Requests (เฉลี่ย 13 req/นาที)
    },
    // Redirect Link (/sl/:slug)
    REDIRECT: {
      WINDOW_MS: 1 * 60 * 1000, // 1 นาที
      MAX_DEV: 10000, // Dev: ปล่อยฟรี
      MAX_PROD: 600, // Prod: 600 ครั้ง/นาที (เฉลี่ย 10 req/วิ)
    },
  },
  // --- กฎการตรวจสอบข้อมูล (Validation Rules) ---
  // ใช้ร่วมกับ Zod Schema
  VALIDATION: {
    PASSWORD_MIN_LEN: 8,
    SLUG_MIN_LEN: 3, // สั้นสุดเช่น /r/abc
    SLUG_MAX_LEN: 30, // ยาวสุดไม่เกินนี้
  },

  // --- การตั้งค่า Cron Job ---
  CRON: {
    // ลบลิงก์ขยะ: รันทุกวัน เวลา 01:00 น.
    CLEANUP_SCHEDULE: "0 * * * *", 
  },
};
