const { nanoid } = require("nanoid");

/**
 * สร้าง Slug แบบสุ่ม
 * @param {number} size ความยาวที่ต้องการ (Default = 7)
 * ความยาว 7 ตัวอักษร รองรับการผสมได้มหาศาล (A-Z, a-z, 0-9, -, _)
 * โอกาสซ้ำน้อยมาก จนแทบไม่ต้องกังวล
 */
const generateSlug = (size = 7) => {
  return nanoid(size);
};

module.exports = {
  generateSlug,
};
