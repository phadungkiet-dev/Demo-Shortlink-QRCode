const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { prisma } = require("./prisma");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Local Strategy (Login ด้วย Email/Password)
// -------------------------------------------------------------------
passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // บอกว่าเราใช้ field 'email' เป็น username
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        // หา User จาก Email
        const user = await prisma.user.findUnique({ where: { email } });

        // เช็คว่ามี User ไหม และต้องเป็นคนละประเภทกับ Google (provider='LOCAL')
        if (!user || user.provider !== "LOCAL") {
          return done(null, false, {
            message: "Invalid email or password.",
          });
        }

        // (Double Check) ถ้าไม่มี Hash แปลว่าข้อมูลผิดพลาด
        if (!user.passwordHash) {
          return done(null, false, {
            message: "Invalid login method. Try Google.",
          });
        }

        // ตรวจสอบรหัสผ่าน (Compare Hash)
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, {
            message: "Invalid email or password.",
          });
        }

        // *สำคัญ* เช็คสถานะโดนแบน (Blocked)
        if (user.isBlocked) {
          return done(null, false, {
            message: "Your account has been suspended by an administrator.",
          });
        }

        // ผ่านทุกด่าน -> ส่ง User กลับไป (ตัด Password ทิ้งเพื่อความปลอดภัย)
        const { passwordHash, ...userWithoutPass } = user;
        return done(null, userWithoutPass);
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
        // ดึง Email จาก Profile ที่ Google ส่งมา
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(
            new Error("Google profile did not return an email."),
            null
          );
        }

        // เช็คว่ามี User นี้ในระบบหรือยัง
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // กรณีเจอ User เก่า

          // Safety Check: ถ้าอีเมลนี้เคยสมัครแบบ LOCAL ไว้ ห้ามให้เข้าผ่าน Google
          // (ป้องกันการสวมรอย หรือความสับสนของข้อมูล)
          if (existingUser.provider !== "GOOGLE") {
            return done(null, false, {
              message:
                "Email already registered with a different method (e.g., local password).",
            });
          }

          // Safety Check: เช็คโดนแบน
          if (existingUser.isBlocked) {
            return done(null, false, {
              message: "Your account has been suspended by an administrator.",
            });
          }
          // Login สำเร็จ
          const { passwordHash, ...userWithoutPass } = existingUser;
          return done(null, userWithoutPass);
        }

        // กรณี User ใหม่ -> สร้างสมาชิกใหม่เลย (Auto Register)
        const newUser = await prisma.user.create({
          data: {
            email: email,
            provider: "GOOGLE",
            providerId: profile.id,
            role: "USER",
          },
        });

        const { passwordHash, ...userWithoutPass } = newUser;
        return done(null, userWithoutPass);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// -------------------------------------------------------------------
// Session Handling (Serialize / Deserialize)
// -------------------------------------------------------------------

// Serialize: ตอน Login สำเร็จ จะเก็บข้อมูลอะไรลง Session?
// ตอบ: เก็บแค่ "User ID" ก็พอ (ประหยัดพื้นที่ Cookie)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize: ทุกครั้งที่ User ส่ง Request เข้ามา เราจะเอา ID จาก Session ไปดึงข้อมูล User เต็มๆ
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (user) {
      // *สำคัญมาก* เช็คสถานะโดนแบนอีกรอบตรงนี้
      // ถ้า Admin กดแบนปุ๊บ -> User กดลิงก์ถัดไป -> Deserialize ทำงาน -> เจอบล็อก -> เด้งหลุดทันที
      if (user.isBlocked) {
        return done(null, false); // req.user จะกลายเป็น null (เหมือนไม่ได้ login)
      }

      const { passwordHash, ...userWithoutPass } = user;
      done(null, userWithoutPass); // เอา User ใส่กลับเข้าไปใน req.user
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, null);
  }
});
