const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcrypt");
const { prisma } = require("./prisma");
const logger = require("../utils/logger");

// 1. Local Strategy (Email/Password)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.provider !== "LOCAL") {
          return done(null, false, {
            message: "Invalid email or password.",
          });
        }

        if (!user.passwordHash) {
          return done(null, false, {
            message: "Invalid login method. Try Google.",
          });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
          return done(null, false, {
            message: "Invalid email or password.",
          });
        }

        // Return user (without password)
        const { passwordHash, ...userWithoutPass } = user;
        return done(null, userWithoutPass);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// 2. Google OAuth Strategy
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
          return done(
            new Error("Google profile did not return an email."),
            null
          );
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          // If user exists but used a different provider
          if (existingUser.provider !== "GOOGLE") {
            return done(null, false, {
              message:
                "Email already registered with a different method (e.g., local password).",
            });
          }
          // Logged in with Google successfully
          const { passwordHash, ...userWithoutPass } = existingUser;
          return done(null, userWithoutPass);
        }

        // Create new user
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

// Serialize user (store user ID in session)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user (fetch user from DB using ID from session)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (user) {
      const { passwordHash, ...userWithoutPass } = user;
      done(null, userWithoutPass); // req.user
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error, null);
  }
});
