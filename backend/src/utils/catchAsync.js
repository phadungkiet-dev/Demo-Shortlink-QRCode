/**
 * catchAsync
 * Wrapper function for async route handlers.
 * Automatically catches errors/promise rejections and passes them to the global error handler.
 * eliminating the need for try-catch blocks in every controller.
 */
module.exports = (fn) => {
  return (req, res, next) => {
    // เรียกใช้ฟังก์ชัน และถ้าเกิด Error (.catch) ให้ส่งต่อให้ next() ทันที
    fn(req, res, next).catch(next);
  };
};
