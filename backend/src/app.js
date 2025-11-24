require("dotenv").config();

// Set timezone
process.env.TZ = process.env.TIMEZONE || "Asia/Bangkok";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const csurf = require("csurf");
const cron = require("node-cron");
const path = require("path");
const pg = require("pg");
const ConnectPgSimple = require("connect-pg-simple")(session);

const { prisma } = require("./config/prisma");
const logger = require("./utils/logger");
const globalErrorHandler = require("./middlewares/errorHandler");
const linkService = require("./services/linkService");

// --- Routes ---
const redirectRouter = require("./routes/redirect");
const apiRouter = require("./routes/index"); // API routes

// --- Passport Config ---
require("./config/passport");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Database Session Store ---
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const sessionStore = new ConnectPgSimple({
  pool: pgPool,
  tableName: "user_sessions", // You might want to create this table
  createTableIfMissing: false,
});

// --- Core Middlewares ---
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));

// --- Session Middleware ---
const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: parseInt(process.env.COOKIE_MAX_AGE_MS || "900000"), // 15 min
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax", // 'strict' can cause issues
  },
});
app.use(sessionMiddleware);

// --- Passport Middleware ---
app.use(passport.initialize());
app.use(passport.session());

// --- Routes ---

// 1. Redirect Route (No CSRF)
// This route is public and must not have CSRF protection
app.use("/r", redirectRouter);

// 2. API Routes (With CSRF)
// CSRF protection middleware
const csrfProtection = csurf({ cookie: true });
app.use("/api", csrfProtection, apiRouter);

// --- Global Error Handler ---
app.use(globalErrorHandler);

// --- Cron Job (Delete Expired Anonymous Links) ---
// Runs daily at 1:00 AM (Asia/Bangkok)
cron.schedule(
  "0 1 * * *",
  async () => {
    logger.info("Running cron job: Deleting expired anonymous links...");
    try {
      const deletedCount = await linkService.deleteExpiredAnonymousLinks();
      logger.info(
        `Cron job complete: Deleted ${deletedCount} expired anonymous links.`
      );
    } catch (error) {
      logger.error("Error during cron job:", error);
    }
  },
  {
    timezone: "Asia/Bangkok",
  }
);

// --- Start Server ---
app.listen(PORT, () => {
  logger.info(`Server running on ${process.env.BASE_URL}`);
  logger.info(`Timezone set to: ${process.env.TZ}`);
});
