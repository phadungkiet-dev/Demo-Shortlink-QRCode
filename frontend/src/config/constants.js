export const APP_CONFIG = {
  // ตั้งค่าเกี่ยวกับ API
  API: {
    TIMEOUT: 10000, // 10 วินาที
    BASE_URL: "/api",
  },

  // กฎการตรวจสอบข้อมูล (ต้องตรงกับ Backend)
  VALIDATION: {
    PASSWORD_MIN_LEN: 8,
    USERNAME_MIN_LEN: 3,
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
