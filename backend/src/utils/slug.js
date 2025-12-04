const { DEFAULTS } = require("../config/constants");
let nanoid;

/**
 * @function loadNanoid
 * @description Helper สำหรับโหลด library 'nanoid' (ESM) ในสภาพแวดล้อม CommonJS
 * ใช้ Singleton Pattern เพื่อโหลดเพียงครั้งเดียวแล้วจำค่าไว้
 */
const loadNanoid = async () => {
  if (!nanoid) {
    const module = await import("nanoid");
    nanoid = module.nanoid;
  }
  return nanoid;
};

/**
 * @function generateSlug
 * @description สร้างรหัสสุ่ม (Slug) สำหรับ Shortlink
 * ใช้ Nanoid ซึ่งมีความปลอดภัยสูง (Collision-resistant) และ URL-friendly (A-Za-z0-9_-)
 * * @param {number} [size=DEFAULTS.SLUG_SIZE] - ความยาวของ Slug (ค่า Default ดึงจาก Config)
 * @returns {Promise<string>} - รหัส Slug (Async function)
 */
const generateSlug = async (size = DEFAULTS.SLUG_SIZE) => {
  // ตรวจสอบความถูกต้องของ size (Validation)
  const length = typeof size === "number" && size > 0 ? size : DEFAULTS.SLUG_SIZE;

  // โหลดและเรียกใช้ nanoid
  const _nanoid = await loadNanoid();
  return _nanoid(length);
};

module.exports = {
  generateSlug,
};
