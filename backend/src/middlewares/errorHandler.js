const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");

const globalErrorHandler = (err, req, res, next) => {
  // บันทึก Error ลง Log File ก่อนเสมอ เพื่อให้ Admin มาตรวจสอบภายหลังได้
  logger.error("Global Error Handler:", err);

  // 1. จัดการ Error จากการตรวจสอบข้อมูล (Validation) ด้วย Zod
  if (err instanceof ZodError) {
    // ดึงเฉพาะใจความสำคัญของ Error (เช่น "Email ไม่ถูกต้อง") ส่งกลับไป
    const validationErrors = err.errors || err.issues || [];
    return res.status(400).json({
      message: "Validation failed.",
      errors: validationErrors.map((e) => ({
        path: e.path.join("."), // ชื่อ field ที่ผิด เช่น "user.email"
        message: e.message,
      })),
    });
  }

  // 2. จัดการ Error จาก Database (Prisma)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Code P2002: ข้อมูลซ้ำ (เช่น สมัครด้วย Email เดิม, Slug ซ้ำ)
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Conflict.",
        detail: `The ${err.meta.target.join(", ")} already exists.`,
      });
    }
    // Code P2025: หาข้อมูลไม่เจอ (Record not found)
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Not Found.",
        detail: err.meta.cause || "The requested resource was not found.",
      });
    }
  }

  // 3. จัดการ Error เรื่อง CSRF Token (จาก library csurf)
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn("Invalid CSRF token received.");
    return res.status(403).json({ message: "Invalid CSRF token." });
  }

  // 4. จัดการ Error เรื่อง Rate Limit (ถ้าหลุดมาจาก middleware)
  if (err.status === 429 || err.name === "RateLimitExceededError") {
    return res
      .status(429)
      .json({ message: "Too many requests. Try again later." });
  }

  // 5. Default Error (500)
  // ถ้าไม่เข้าเงื่อนไขข้างบนเลย ให้ถือเป็น Server Error ทั่วไป
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || "An unexpected error occurred.",
    // ใน Dev mode ให้ส่ง stack trace ไปด้วยเพื่อ debug ง่ายขึ้น
    // แต่ใน Production ห้ามส่งเด็ดขาด!
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = globalErrorHandler;
