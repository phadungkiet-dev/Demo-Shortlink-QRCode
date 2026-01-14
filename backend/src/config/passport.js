const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const { prisma } = require("./prisma");
const authService = require("../services/authService");
require("dotenv").config();
const AppError = require("../utils/AppError");

// [---------- JWT Strategy (สำหรับ Protected Routes) ----------]
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || "access_secret_should_be_changed",
  // algorithm: ["HS256"] // Default is HS256
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // payload.sub คือ userId ที่เราฝังไว้ตอน sign token
      // ตรวจสอบว่า User ยังมีตัวตนอยู่จริงใน DB (และไม่โดนแบน)
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return done(null, false); // Token ถูกต้องแต่ไม่พบ User
      }

      // [Optional] เช็คสถานะโดนแบนตรงนี้ก็ได้ ถ้าต้องการให้ Token ใช้ไม่ได้ทันทีที่โดนแบน
      // if (user.isBlocked) return done(null, false);

      // ส่ง user object ไปให้ req.user
      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  })
);

// [---------- Local Strategy (Login ด้วย Email/Password) ----------]
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false, // Explicitly state no session
    },
    async (email, password, done) => {
      try {
        // Delegate logic ไปที่ authService
        const user = await authService.verifyUserCredentials(email, password);

        // เช็คสถานะโดนแบน (Logic นี้อาจจะซ้ำกับ Service แต่ใส่ไว้เพื่อความชัวร์ในระดับ Strategy)
        if (user.isBlocked) {
          return done(null, false, {
            message: "Your account has been suspended.",
          });
        }

        // Login ผ่าน! ส่ง user object ไปให้ Passport
        return done(null, user);
      } catch (error) {
        // กรณี Password ผิด หรือไม่พบ User หรือ Service throw error มา
        // ส่ง false พร้อม message เพื่อให้ Passport handle เป็น 401
        return done(null, false, { message: error.message });
      }
    }
  )
);

// [---------- Google OAuth Strategy (Login ผ่าน Google) ----------]
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      scope: ["profile", "email"],
      session: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        const displayName = profile.displayName;
        const googleId = profile.id;
        const avatar =
          profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        if (!email) {
          return done(new Error("No email found from Google profile."), false);
        }
        // if (!email) {
        //   return done(
        //     new AppError("No email found from Google profile.", 400),
        //     null
        //   );
        // }

        // ใช้ Service จัดการ Find or Create
        const user = await authService.handleGoogleAuth(
          email,
          googleId,
          displayName,
          avatar
        );

        if (user.isBlocked) {
          return done(null, false, { message: "Your account has been suspended." });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);
