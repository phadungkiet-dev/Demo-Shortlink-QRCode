// หมายเหตุ: เราตั้ง process.env.TZ = 'Asia/Bangkok' ไว้ที่ app.js แล้ว
// ดังนั้น Date object จะอ้างอิงตาม Timezone ของ Server/Container

/**
 * บวกจำนวนวันเพิ่มเข้าไปในวันที่กำหนด
 * ใช้สำหรับคำนวณวันหมดอายุ (ExpiredAt)
 * @param {Date} date วันที่ตั้งต้น
 * @param {number} days จำนวนวันที่ต้องการบวกเพิ่ม
 * @returns {Date} วันที่ใหม่
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// ฟังก์ชันดึงเวลาปัจจุบัน (เผื่ออนาคตอยากเปลี่ยนวิธีดึงเวลา)
const getNow = () => {
  return new Date();
};

module.exports = {
  addDays,
  getNow,
};
