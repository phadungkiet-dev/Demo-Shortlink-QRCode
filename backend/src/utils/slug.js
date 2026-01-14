const { DEFAULTS } = require("../config/constants");
let nanoidGenerate;

/**
 * @function loadNanoid
 * @description โหลด nanoid และตั้งค่า Custom Alphabet
 * ตัดอักขระที่สับสนง่าย (l, 1, I, O, 0) และตัด Symbol (-_ ) ออกเพื่อให้ Clean URL
 */
const loadNanoid = async () => {
  if (!nanoidGenerate) {
    const { customAlphabet } = await import("nanoid");

    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    nanoidGenerate = customAlphabet(alphabet);
  }
  return nanoidGenerate;
};

/**
 * @function generateSlug
 * @description สร้างรหัสสุ่ม (Slug) สำหรับ Shortlink
 * @param {number} [size=DEFAULTS.SLUG_SIZE] - ความยาวของ Slug
 * @returns {Promise<string>} - รหัส Slug
 */
const generateSlug = async (size = DEFAULTS.SLUG_SIZE) => {
  // ตรวจสอบความถูกต้องของ size (Validation)
  const length = typeof size === "number" && size > 0 ? size : DEFAULTS.SLUG_SIZE;

  // โหลดและเรียกใช้ nanoid
  const generate = await loadNanoid();
  return generate(length);
};

module.exports = {
  generateSlug,
};
