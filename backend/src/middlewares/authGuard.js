// Middleware ตรวจสอบว่า "Login แล้วหรือยัง?"
const isAuthenticated = (req, res, next) => {
  // req.isAuthenticated() เป็นฟังก์ชันที่ Passport.js ฝังมาให้ใน request object
  if (req.isAuthenticated()) {
    return next();
  }
  // ถ้าไม่มี -> ส่งกลับ 401 Unauthorized
  res.status(401).json({ message: "Unauthorized. Please log in." });
};

// Middleware ตรวจสอบว่า "เป็น Admin หรือไม่?"
const isAdmin = (req, res, next) => {
  // 1. ต้อง Login ก่อน (req.isAuthenticated)
  // 2. Role ต้องเป็น 'ADMIN'
  if (req.isAuthenticated() && req.user.role === "ADMIN") {
    return next(); // อนุญาตให้ผ่าน
  }
  // ถ้าไม่ใช่ Admin -> ส่งกลับ 403 Forbidden (รู้ว่าคือใคร แต่ไม่มีสิทธิ์)
  res.status(403).json({ message: "Forbidden. Admin access required." });
};

module.exports = {
  isAuthenticated,
  isAdmin,
};
