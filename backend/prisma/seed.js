const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { USER_ROLES, DEFAULTS } = require("../src/config/constants");

const prisma = new PrismaClient();

async function main() {
  console.log(`🌱 Start seeding ...`);

  const saltRounds = 10;
  const password = "User#123"; // รหัสผ่านเดียวกันเพื่อง่ายต่อการเทส
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // -----------------------------------------------------------------------
  // Create Users (ใช้ upsert เพื่อให้รันซ้ำได้ไม่ Error)
  // -----------------------------------------------------------------------

  // Admin (Super User)
  const admin = await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    update: {},
    create: {
      email: "admin@local.dev",
      passwordHash,
      provider: "LOCAL",
      role: USER_ROLES.ADMIN,
    },
  });

  // Normal User (Active)
  const user = await prisma.user.upsert({
    where: { email: "user@local.dev" },
    update: {},
    create: {
      email: "user@local.dev",
      passwordHash,
      provider: "LOCAL",
      role: USER_ROLES.USER,
      linkLimit: DEFAULTS.LINK_LIMIT,
    },
  });

  // Blocked User (Suspended) - เอาไว้เทสระบบป้องกัน
  const blockedUser = await prisma.user.upsert({
    where: { email: "blocked@local.dev" },
    update: {},
    create: {
      email: "blocked@local.dev",
      passwordHash,
      provider: "LOCAL",
      role: "USER",
      isBlocked: true, // โดนแบน
      linkLimit: DEFAULTS.LINK_LIMIT,
    },
  });

  console.log(`✅ Created users: Admin, User, BlockedUser`);

  // -----------------------------------------------------------------------
  // Create Links
  // -----------------------------------------------------------------------

  // เคลียร์ลิงก์เก่าก่อน (Optional) เพื่อไม่ให้ข้อมูลซ้ำซ้อนตอน Seed หลายรอบ
  await prisma.link.deleteMany({});

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 1); // เมื่อวาน (หมดอายุแล้ว)

  // Normal Link (ของ User)
  await prisma.link.create({
    data: {
      slug: "google",
      targetUrl: "https://google.com",
      ownerId: user.id,
      expiredAt: thirtyDaysFromNow,
      isPublic: true,
    },
  });

  // Custom QR Link (ของ Admin) - เทส JSON Field
  await prisma.link.create({
    data: {
      slug: "prisma-qr",
      targetUrl: "https://prisma.io",
      ownerId: admin.id,
      expiredAt: thirtyDaysFromNow,
      qrOptions: {
        dotsOptions: { color: "#E11D48", type: "dots" },
        backgroundOptions: { color: "#ffffff" },
      },
    },
  });

  // Expired Link (ลิงก์หมดอายุ)
  await prisma.link.create({
    data: {
      slug: "expired",
      targetUrl: "https://expired.com",
      ownerId: user.id,
      expiredAt: expiredDate, // หมดอายุแล้ว
    },
  });

  // Anonymous Link (ไม่มีเจ้าของ)
  await prisma.link.create({
    data: {
      slug: "anon",
      targetUrl: "https://github.com",
      ownerId: null,
      expiredAt: thirtyDaysFromNow,
    },
  });

  console.log(`✅ Created links: /r/google, /r/prisma-qr, /r/expired, /r/anon`);
  console.log(`🌱 Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
