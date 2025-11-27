const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { prisma } = require("./prisma");

// -------------------------------------------------------------------
// Local Strategy (Login ด้วย Email/Password)
// -------------------------------------------------------------------
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // 1. หา User จาก Email
        const user = await prisma.user.findUnique({ where: { email } });

        // 2. ถ้าไม่เจอ User หรือเป็น User ที่สมัครผ่าน Google (ไม่มีรหัสผ่าน)
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password." });
        }

        // 3. ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password." });
        }

        // 4. เช็คสถานะโดนแบน
        if (user.isBlocked) {
          return done(null, false, {
            message: "Your account has been suspended.",
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// -------------------------------------------------------------------
// Google OAuth Strategy (Login ผ่าน Google)
// -------------------------------------------------------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found from Google profile."), null);
        }

        // 1. เช็คว่ามี User นี้หรือยัง
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // 2. ถ้ามีแล้ว -> เช็คว่า Login ถูกวิธีไหม
          if (user.provider !== "GOOGLE") {
            return done(null, false, {
              message:
                "This email is registered with password. Please login normally.",
            });
          }
          // 3. เช็คโดนแบน
          if (user.isBlocked) {
            return done(null, false, {
              message: "Your account has been suspended.",
            });
          }
        } else {
          // 4. ถ้ายังไม่มี -> สร้าง User ใหม่ (Auto Register)
          user = await prisma.user.create({
            data: {
              email: email,
              provider: "GOOGLE",
              providerId: profile.id,
              role: "USER",
              linkLimit: 10, // ให้ Limit เริ่มต้น
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// -------------------------------------------------------------------
// Session Handling (Serialize / Deserialize)
// -------------------------------------------------------------------
passport.serializeUser((user, done) => {
  done(null, user.id); // เก็บแค่ ID ลง Session Store
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    // Double Check: ถ้า User โดนลบหรือโดนแบนระหว่างที่ Session ยังค้างอยู่ ให้ดีดออก
    if (!user || user.isBlocked) {
      return done(null, false);
    }

    const { passwordHash, ...userWithoutPass } = user;
    done(null, userWithoutPass);
  } catch (error) {
    done(error, null);
  }
});
