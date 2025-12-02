const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Helper Functions: แปลง Error แปลกๆ ให้เป็น AppError (มาตรฐานของเรา)
// -------------------------------------------------------------------

// จัดการ Error ข้อมูลซ้ำจาก Prisma (Code P2002)
const handlePrismaUniqueError = (err) => {
  // err.meta.target จะบอกว่า field ไหนที่ซ้ำ
  const field =
    err.meta && err.meta.target ? err.meta.target.join(", ") : "Field";
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
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400); // 400 Bad Request
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

const handleCSRFError = () =>
  new AppError(
    "Session invalid or expired. Please refresh and try again.",
    403
  );

// -------------------------------------------------------------------
// Response Generators: ส่ง Response กลับตาม Environment
// -------------------------------------------------------------------

const sendErrorDev = (err, req, res) => {
  // Dev Mode: ส่งทุกอย่างที่รู้ เพื่อ Debug
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// แบบ Prod: ส่งเฉพาะที่จำเป็น และซ่อน Error ภายใน
const sendErrorProd = (err, req, res) => {
  // API Error (Request ที่ขึ้นต้นด้วย /api)
  if (req.originalUrl.startsWith("/api")) {
    // Operational Error: Error ที่เรารู้จักและตั้งใจ throw (เช่น "Password wrong")
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Programming/Unknown Error: บักที่เราไม่รู้ (เช่น Database ล่ม, Code พัง)
    logger.error("ERROR 💥", err);

    // ส่งข้อความกลางๆ ไปหา User ไม่ให้เขาตกใจ หรือเห็นข้อมูลความลับ
    return res.status(500).json({
      status: "error",
      message: "Something went wrong! Please try again later.",
    });
  }

  // Rendered Website Error (ถ้ามี Server-Side Rendering)
  // กรณีนี้เราทำ API เป็นหลัก แต่เผื่อไว้สำหรับ Redirect
  logger.error("ERROR 💥", err);
  return res.status(err.statusCode).send("Something went wrong!");
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
    error.code = err.code;
    error.name = err.name;
    error.meta = err.meta;

    // --- แปลง Error ประเภทต่างๆ ให้เป็น AppError ---

    // Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma: Unique Constraint (P2002)
      if (err.code === "P2002") error = handlePrismaUniqueError(err);
      // Prisma: Not Found (P2025)
      if (err.code === "P2025") error = handlePrismaNotFoundError(err);
    }

    // Zod Validation Errors
    if (err instanceof ZodError) error = handleZodError(err);

    // CSRF & JWT Errors
    if (err.code === "EBADCSRFTOKEN") error = handleCSRFError();
    if (err.name === "JsonWebTokenError") error = handleJWTError();

    sendErrorProd(error, req, res);
  }
};
