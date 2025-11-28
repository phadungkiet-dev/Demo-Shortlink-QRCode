module.exports = {
  // สิทธิ์ผู้ใช้งาน
  USER_ROLES: {
    ADMIN: "ADMIN",
    USER: "USER",
  },
  // ค่า Default ต่างๆ
  DEFAULTS: {
    LINK_LIMIT: 10,
    ANON_LINK_EXPIRY_DAYS: 7,
    USER_LINK_EXPIRY_DAYS: 30,
  },
  // การตั้งค่า Cookie
  COOKIE: {
    NAME: "connect.sid",
    SECRET_KEY: "_csrf", // ชื่อ Cookie สำหรับ CSRF
    MAX_AGE: 900000, // 15 นาที (Milliseconds)
  },
  // การตั้งค่า Storage
  STORAGE: {
    LOCAL_PATH: "storage/logos",
    MAX_FILE_SIZE: 1024 * 1024, // 1MB
  },
  RATE_LIMIT: {
    // จำกัดการสร้างลิงก์ (Create Link)
    CREATE: {
      WINDOW_MS: 60 * 60 * 1000, // 1 ชั่วโมง
      MAX_DEV: 1000, // สำหรับ Dev Test ง่ายๆ
      MAX_PROD: 5, // สำหรับ Prod (กัน Spam)
    },
    // API ทั่วไป (General API)
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000, // 15 นาที
      MAX_DEV: 5000,
      MAX_PROD: 200,
    },
  },
  VALIDATION: {
    PASSWORD_MIN_LEN: 8,
    SLUG_MIN_LEN: 3,
    SLUG_MAX_LEN: 30,
  },
};
