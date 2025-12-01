const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { prisma } = require("./prisma");
const { DEFAULTS, USER_ROLES } = require("./constants");

// -------------------------------------------------------------------
// Local Strategy (Login ด้วย Email/Password)
// -------------------------------------------------------------------
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // บอก Passport ว่าเราใช้ field 'email' แทน username
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // หา User จาก Email
        const user = await prisma.user.findUnique({ where: { email } });

        // ถ้าไม่เจอ หรือ user นี้ไม่มีรหัสผ่าน (เช่น สมัครผ่าน Google มา)
        if (!user || !user.passwordHash) {
          // done(error, user, options) -> ส่ง false เพื่อบอกว่า Login ไม่ผ่าน
          return done(null, false, { message: "Invalid email or password." });
        }

        // ตรวจสอบรหัสผ่าน (เทียบ Plain Text กับ Hash ใน DB)
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password." });
        }

        // เช็คสถานะโดนแบน (สำคัญมาก!)
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
      scope: ["profile", "email"], // ขอข้อมูล Profile และ Email
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found from Google profile."), null);
        }

        // เช็คว่ามี User นี้หรือยัง
        let user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          // Case: มี User อยู่แล้ว -> เช็คว่าเคยสมัครแบบไหน
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
          // Case: ยังไม่มี User -> สมัครสมาชิกให้อัตโนมัติ (Auto Register)
          user = await prisma.user.create({
            data: {
              email: email,
              provider: "GOOGLE",
              providerId: profile.id,
              role: USER_ROLES.USER,
              linkLimit: DEFAULTS.LINK_LIMIT,
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
// Serialize: ตอน Login สำเร็จ จะเก็บอะไรลงใน Session Cookie?
// ตอบ: เก็บแค่ "User ID" ก็พอ (เพื่อประหยัดพื้นที่ Cookie)
passport.serializeUser((user, done) => {
  done(null, user.id); // เก็บแค่ ID ลง Session Store
});

// Deserialize: เมื่อ User ยื่น Cookie มาใน Request ถัดไป จะแปลง ID กลับเป็น User Object ยังไง?
// ตอบ: เอา ID ไป Query หา User ใน DB
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    // Double Check: ถ้า User โดนลบหรือโดนแบนระหว่างที่ Session ยังค้างอยู่ ให้ดีดออก
    if (!user || user.isBlocked) {
      return done(null, false);
    }

    // ตัด Password Hash ออกก่อนแปะลงใน req.user เพื่อความปลอดภัย
    const { passwordHash, ...userWithoutPass } = user;
    done(null, userWithoutPass);
  } catch (error) {
    done(error, null);
  }
});
