/**
 * @function catchAsync
 * @description Wrapper Function สำหรับห่อหุ้ม Async Controller
 * ทำหน้าที่ดักจับ Error (Promise Rejection) แล้วส่งต่อให้ Global Error Handler อัตโนมัติ
 * ช่วยลดการเขียน try-catch block ซ้ำซ้อนในทุก Controller
 * @param {Function} fn - Async Function ที่ต้องการห่อหุ้ม (Controller)
 * @returns {Function} Express Middleware Function
 */
module.exports = (fn) => {
  return (req, res, next) => {
    // เรียกใช้ฟังก์ชัน และถ้าเกิด Error (.catch) ให้ส่งต่อให้ next() ทันที
    fn(req, res, next).catch(next);
  };
};
