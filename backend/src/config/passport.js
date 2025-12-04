const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { prisma } = require("./prisma");
const { DEFAULTS, USER_ROLES } = require("./constants");
const AppError = require("../utils/AppError");

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
        const user = await prisma.user.findUnique({ where: { email } });

        // ถ้าไม่เจอ หรือ user นี้ไม่มีรหัสผ่าน (เช่น สมัครผ่าน Google มา)
        if (!user || !user.passwordHash) {
          // ใช้ Generic Message เพื่อป้องกัน User Enumeration Attack
          return done(null, false, { message: "Invalid email or password." });
        }

        // ตรวจสอบรหัสผ่าน (เทียบ Plain Text กับ Hash ใน DB)
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password." });
        }

        // เช็คสถานะโดนแบน
        if (user.isBlocked) {
          return done(null, false, {
            message: "Your account has been suspended.",
          });
        }

        // Login ผ่าน! ส่ง user object ไปให้ Passport
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
        const email =
          profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email) {
          return done(
            new AppError("No email found from Google profile.", 400),
            null
          );
        }

        // เช็คว่ามี User นี้หรือยัง
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // ถ้ามี User -> เช็ค Provider
          if (user.provider !== "GOOGLE") {
            // ถ้าเคยสมัครด้วย Email/Password จะไม่ให้ Login ผ่าน Google (เพื่อความปลอดภัย)
            return done(null, false, {
              message:
                "This email is registered with password. Please login normally.",
            });
          }
          // เช็คโดนแบน
          if (user.isBlocked) {
            return done(null, false, {
              message: "Your account has been suspended.",
            });
          }
        } else {
          // ถ้าไม่มี User -> สร้างใหม่ (Auto Register)
          // [Refinement] ห่อ create ด้วย try-catch ย่อย เพื่อดักจับ Unique Constraint (เผื่อ Race Condition)
          try {
            user = await prisma.user.create({
              data: {
                email: email,
                provider: "GOOGLE",
                providerId: profile.id,
                role: USER_ROLES.USER,
                linkLimit: DEFAULTS.LINK_LIMIT,
              },
            });
          } catch (createError) {
            // ถ้า Error เพราะ Email ซ้ำ (P2002) แปลว่ามี request อื่นสร้างตัดหน้าไปแล้ว
            // ให้ลองดึงข้อมูลอีกรอบ
            if (createError.code === "P2002") {
              user = await prisma.user.findUnique({ where: { email } });
            } else {
              throw createError; // Error อื่นโยนทิ้งไป
            }
          }
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// -------------------------------------------------------------------
// Session Handling
// -------------------------------------------------------------------
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: id } });

    if (!user || user.isBlocked) {
      // ถ้าหาไม่เจอ หรือโดนแบน ให้ invalidate session
      return done(null, false);
    }

    // Remove sensitive data
    const { passwordHash, ...userWithoutPass } = user;
    done(null, userWithoutPass);
  } catch (error) {
    done(error, null);
  }
});
