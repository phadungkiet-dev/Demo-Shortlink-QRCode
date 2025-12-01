let nanoid;

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
 * @param {number} [size=7] - ความยาวของ Slug ที่ต้องการ (ค่า Default คือ 7)
 * @returns {Promise<string>} - รหัส Slug (ต้อง await เพราะเป็น Async)
 */
const generateSlug = async (size = 7) => {
  // ตรวจสอบความถูกต้องของ size
  const length = typeof size === "number" && size > 0 ? size : 7;

  // โหลดและเรียกใช้ nanoid
  const _nanoid = await loadNanoid();
  console.log(_nanoid);
  return _nanoid(length);
};

module.exports = {
  generateSlug,
};
