export const APP_CONFIG = {
  // ตั้งค่าเกี่ยวกับ API
  API: {
    TIMEOUT: 15000, // 15 วินาที
    BASE_URL: "/api",
  },
  // --- ตั้งค่าเส้นทาง (ต้องตรงกับ Backend) ---
  ROUTES: {
    SHORT_LINK_PREFIX: "sl",
  },
  // Roles
  USER_ROLES: {
    ADMIN: "ADMIN",
    USER: "USER",
  },

  // กฎการตรวจสอบข้อมูล (ต้องตรงกับ Backend)
  VALIDATION: {
    PASSWORD_MIN_LEN: 8,
    SLUG_MIN_LEN: 3,
    SLUG_MAX_LEN: 30,
  },

  // ค่าเริ่มต้นของระบบ
  DEFAULTS: {
    LINK_LIMIT: 10,
  },

  // ค่าเริ่มต้นของ QR Code
  QR: {
    DEFAULT_SIZE: 300,
    DEFAULT_COLOR: "#4f46e5", // Indigo-600
    DEFAULT_BG: "#ffffff",
  },

  // ค่าเริ่มต้นของ Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 9,
  },
};
