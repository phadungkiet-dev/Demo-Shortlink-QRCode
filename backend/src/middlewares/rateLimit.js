const rateLimit = require("express-rate-limit");

// Rate limit for anonymous link creation
const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per IP per hour
  message: {
    message:
      "Too many links created from this IP. Please wait 1 hour or log in.",
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).send(options.message);
  },
  skip: (req, res) => req.isAuthenticated(), // Skip if user is logged in
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per 15 min
  message: { message: "Too many requests. Please wait 15 minutes." },
});

module.exports = {
  createLinkLimiter,
  apiLimiter,
};
