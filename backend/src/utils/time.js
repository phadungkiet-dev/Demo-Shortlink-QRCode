// หมายเหตุ: process.env.TZ ถูกตั้งค่าไว้ที่ app.js แล้ว (เช่น 'Asia/Bangkok')
// ดังนั้น Date object จะอ้างอิงตาม System Time ของ Server/Container

/**
 * @function addDays
 * @description คำนวณวันที่ในอนาคต โดยบวกจำนวนวันเพิ่มจากวันที่กำหนด
 * ใช้สำหรับคำนวณวันหมดอายุ (ExpiredAt) ของลิงก์
 * * @param {Date} date - วันที่ตั้งต้น
 * @param {number} days - จำนวนวันที่ต้องการบวกเพิ่ม
 * @returns {Date} - วันที่ผลลัพธ์
 */
const addDays = (date, days) => {
  // Clone date object เพื่อไม่ให้กระทบค่าเดิม (Immutability)
  const result = new Date(date);

  // ตรวจสอบว่าเป็น Valid Date หรือไม่
  if (isNaN(result.getTime())) {
    throw new Error("Invalid date provided to addDays function.");
  }

  result.setDate(result.getDate() + days);
  return result;
};

/**
 * @function getNow
 * @description ดึงเวลาปัจจุบัน (Wrapper Function)
 * สร้างไว้เพื่อให้ง่ายต่อการ Mock เวลาตอนเขียน Unit Test ในอนาคต
 * * @returns {Date} - เวลาปัจจุบัน
 */
const getNow = () => {
  return new Date();
};

module.exports = {
  addDays,
  getNow,
};
