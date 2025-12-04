const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Helper Functions: แปลง Error แปลกๆ ให้เป็น AppError
// -------------------------------------------------------------------

const handlePrismaUniqueError = (err) => {
  const field =
    err.meta && err.meta.target ? err.meta.target.join(", ") : "Field";
  const message = `Duplicate field value: ${field}. Please use another value.`;
  return new AppError(message, 409);
};

const handlePrismaNotFoundError = (err) => {
  return new AppError("Record not found.", 404);
};

const handleZodError = (err) => {
  const errors = err.errors.map((el) => `${el.path.join(".")}: ${el.message}`);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

const handleCSRFError = () =>
  new AppError(
    "Session invalid or expired. Please refresh and try again.",
    403
  );

// -------------------------------------------------------------------
// Response Generators
// -------------------------------------------------------------------

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  if (req.originalUrl.startsWith("/api")) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    logger.error("ERROR 💥", err);

    return res.status(500).json({
      status: "error",
      message: "Something went wrong! Please try again later.",
    });
  }

  logger.error("ERROR 💥", err);
  return res.status(err.statusCode).send("Something went wrong!");
};

// -------------------------------------------------------------------
// Main Middleware
// -------------------------------------------------------------------
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    error.code = err.code;

    // --- แปลง Error Types ---
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
