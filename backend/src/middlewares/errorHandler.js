const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Helper Functions: แปลง Error แปลกๆ ให้เป็น AppError (มาตรฐานของเรา)
// -------------------------------------------------------------------

// จัดการ Error ข้อมูลซ้ำจาก Prisma (Code P2002)
const handlePrismaUniqueError = (err) => {
  const field = err.meta.target.join(", ");
  const message = `Duplicate field value: ${field}. Please use another value.`;
  return new AppError(message, 409); // 409 Conflict
};

// จัดการ Error หาข้อมูลไม่เจอจาก Prisma (Code P2025)
const handlePrismaNotFoundError = (err) => {
  return new AppError("Record not found.", 404);
};

// จัดการ Error จากการ Validate ข้อมูลด้วย Zod
const handleZodError = (err) => {
  // ดึงข้อความ Error ทั้งหมดมารวมกัน
  const errors = err.errors.map((el) => `${el.path.join(".")}: ${el.message}`);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400); // 400 Bad Request
};

// จัดการ Error JWT (เผื่ออนาคตใช้ JWT)
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired. Please log in again.", 401);

// -------------------------------------------------------------------
// Response Generators: ส่ง Response กลับตาม Environment
// -------------------------------------------------------------------

const sendErrorDev = (err, req, res) => {
  // Dev Mode: ส่งทุกอย่างที่รู้ เพื่อ Debug ง่าย
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API Error (Request ที่ขึ้นต้นด้วย /api)
  if (req.originalUrl.startsWith("/api")) {
    // 1) Operational, trusted error: ส่ง message ที่เราเขียนเองไปให้ Client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // 2) Programming or other unknown error: ไม่ส่งรายละเอียดไป ให้ Log เก็บไว้ดูเอง
    logger.error("ERROR 💥", err);

    return res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }

  // B) Rendered Website Error (ถ้ามี Server-Side Rendering)
  // กรณีนี้เราทำ API เป็นหลัก แต่เผื่อไว้สำหรับ Redirect
  logger.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
  });
};

// -------------------------------------------------------------------
// Main Middleware
// -------------------------------------------------------------------
module.exports = (err, req, res, next) => {
  // กำหนดค่า Default ถ้าไม่มี
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    // Copy Error Object เพื่อนำมาปรับแต่ง (ระวัง: Error object บางที copy ไม่ติด property พิเศษ)
    let error = Object.create(err);
    error.message = err.message;

    // --- แปลง Error ประเภทต่างๆ ให้เป็น AppError ---

    // 1. Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") error = handlePrismaUniqueError(err);
      if (err.code === "P2025") error = handlePrismaNotFoundError(err);
    }

    // 2. Zod Validation Errors
    if (err instanceof ZodError) error = handleZodError(err);

    // 3. JWT Errors (ถ้ามี)
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    // 4. CSRF Errors
    if (err.code === "EBADCSRFTOKEN") {
      error = new AppError("Invalid CSRF Token.", 403);
    }

    sendErrorProd(error, req, res);
  }
};
