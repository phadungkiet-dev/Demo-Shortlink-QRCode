const { nanoid } = require("nanoid");

/**
 * @function generateSlug
 * @description สร้างรหัสสุ่ม (Slug) สำหรับ Shortlink
 * ใช้ Library 'nanoid' ซึ่งมีความเร็วสูงและโอกาสซ้ำต่ำมาก (Collision Resistant)
 * * @param {number} [size=7] - ความยาวของ Slug ที่ต้องการ (ค่า Default คือ 7)
 * @returns {string} - รหัส Slug ที่สุ่มได้ (เช่น "Xy7_kP9")
 */
const generateSlug = (size = 7) => {
  // ตรวจสอบว่า size เป็นตัวเลขและมากกว่า 0
  const length = typeof size === "number" && size > 0 ? size : 7;
  return nanoid(length);
};

module.exports = {
  generateSlug,
};
