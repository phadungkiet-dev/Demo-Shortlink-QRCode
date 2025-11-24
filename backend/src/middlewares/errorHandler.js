const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");

const globalErrorHandler = (err, req, res, next) => {
  logger.error("Global Error Handler:", err);

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const validationErrors = err.errors || err.issues || [];
    return res.status(400).json({
      message: "Validation failed.",
      errors: validationErrors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // 2. Prisma Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g., slug already exists)
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "Conflict.",
        detail: `The ${err.meta.target.join(", ")} already exists.`,
      });
    }
    // Record not found
    if (err.code === "P2025") {
      return res.status(404).json({
        message: "Not Found.",
        detail: err.meta.cause || "The requested resource was not found.",
      });
    }
  }

  // 3. CSRF Errors (from csurf)
  if (err.code === "EBADCSRFTOKEN") {
    logger.warn("Invalid CSRF token received.");
    return res.status(403).json({ message: "Invalid CSRF token." });
  }

  // 4. Rate Limit Errors (from express-rate-limit)
  if (err.status === 429 || err.name === "RateLimitExceededError") {
    return res
      .status(429)
      .json({ message: "Too many requests. Try again later." });
  }

  // 5. Default Server Error
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    message: err.message || "An unexpected error occurred.",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = globalErrorHandler;
