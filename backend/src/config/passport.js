const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const { prisma } = require("./prisma");
const authService = require("../services/authService");
require("dotenv").config();

// [---------- JWT Strategy (สำหรับ Protected Routes) ----------]
// ตรวจสอบ Token ที่แนบมาใน Header: Authorization: Bearer <token>
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || "63f4945d921d599f27ae4fdf5bada3f2",
};

passport.use(
  new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      // payload.sub คือ User ID ที่ฝังไว้ใน Token
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      // ถ้าไม่เจอ User (เช่น ถูกลบไปแล้ว) -> Token ถือว่าโมฆะ
      if (!user) {
        return done(null, false);
      }

      // [Security] ถ้า User โดนแบน ให้ปฏิเสธทันที
      if (user.isBlocked) {
        return done(null, false);
      }

      // ผ่าน -> แนบ User Object ไปที่ req.user
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
      session: false, // เราใช้ JWT ไม่ใช้ Session
    },
    async (email, password, done) => {
      try {
        // ให้ authService ตรวจสอบความถูกต้อง
        const user = await authService.verifyUserCredentials(email, password);

        // ตรวจสอบสถานะโดนแบน
        if (user.isBlocked) {
          return done(null, false, {
            message: "Your account has been suspended.",
          });
        }

        // ผ่าน -> ส่ง User กลับไปเพื่อสร้าง Token
        return done(null, user);
      } catch (error) {
        // กรณี User/Pass ผิด หรือ Error อื่นๆ
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

        if (!email) {
          return done(new Error("No email found from Google profile."), false);
        }

        // ส่งข้อมูลให้ Service จัดการ (Find or Create)
        const user = await authService.handleGoogleAuth(
          email,
          googleId,
          displayName,
        );

        if (user.isBlocked) {
          return done(null, false, {
            message: "Your account has been suspended.",
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);
