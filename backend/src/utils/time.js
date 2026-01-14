/**
 * @function addDays
 * @description คำนวณวันที่ในอนาคต โดยบวกจำนวนวันเพิ่มจากวันที่กำหนด
 * @param {Date} date - วันที่ตั้งต้น
 * @param {number} days - จำนวนวันที่ต้องการบวกเพิ่ม
 * @returns {Date} - วันที่ผลลัพธ์ (New Instance)
 */
const addDays = (date, days) => {
  // Clone date object เพื่อไม่ให้กระทบค่าเดิม (Immutability)
  const result = new Date(date);

  // ตรวจสอบว่าเป็น Valid Date หรือไม่
  if (isNaN(result.getTime())) {
    throw new Error("Invalid date provided to addDays function.");
  }

  // แปลง days เป็น Integer ป้องกันกรณีส่งมาเป็น string หรือ float
  const daysToAdd = parseInt(days, 10);

  result.setDate(result.getDate() + daysToAdd);
  return result;
};

/**
 * @function getNow
 * @description ดึงเวลาปัจจุบัน (Wrapper Function)
 * ช่วยให้ Mock เวลาได้ง่ายตอนทำ Unit Test
 * @returns {Date} - เวลาปัจจุบัน
 */
const getNow = () => {
  return new Date();
};

/**
 * @function isExpired
 * @description ตรวจสอบว่าวันที่กำหนด หมดอายุหรือยัง (เทียบกับเวลาปัจจุบัน)
 * @param {Date} dateToCheck - วันที่ต้องการเช็ค (เช่น expiredAt จาก DB)
 * @returns {boolean} - true ถ้าหมดอายุแล้ว, false ถ้ายังไม่หมด
 */
const isExpired = (dateToCheck) => {
  if (!dateToCheck) return false; // ถ้าไม่มีวันหมดอายุ ถือว่าไม่หมดอายุ
  
  const now = getNow();
  const target = new Date(dateToCheck);
  
  // ถ้าเวลาปัจจุบัน มากกว่า วันที่กำหนด = หมดอายุ
  return now.getTime() > target.getTime();
};

module.exports = {
  addDays,
  getNow,
  isExpired,
};
