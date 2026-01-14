const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcrypt");
const path = require("path");

// [---------- โหลด Environment Variables ----------]
const envPath = path.join(__dirname, "../.env");
require("dotenv").config({ path: envPath });

// ตรวจสอบว่ามีค่า Connection String หรือไม่
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  console.error("❌ Error: Missing DATABASE_URL or DIRECT_URL in .env");
  console.error("Please check your .env file at:", envPath);
  process.exit(1);
}

// [---------- Initialize Prisma Client with Adapter (แก้ไขจุดที่ Error) ----------]
// ใช้ DIRECT_URL (Port 5432) สำหรับงาน Seed เพื่อความเสถียร
// ใช้ DIRECT_URL (Port 5432) สำหรับงาน Seed เพื่อความเสถียร
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const pool = new Pool({ 
  connectionString,
  max: 5 // ใช้ connection น้อยๆ สำหรับ script seed ก็พอ
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const { USER_ROLES, DEFAULTS, SECURITY } = require("../src/config/constants");
const { generateSlug } = require("../src/utils/slug");
const { addDays } = require("../src/utils/time");

// --- Helper Functions ---
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ข้อมูลจำลองสำหรับสุ่ม
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36",
];
const REFERRERS = [
  "https://facebook.com",
  "https://twitter.com",
  "https://google.com",
  "https://instagram.com",
  "Direct",
];
const LOCATIONS = [
  { country: "TH", city: "Bangkok" },
  { country: "TH", city: "Chiang Mai" },
  { country: "US", city: "New York" },
  { country: "JP", city: "Tokyo" },
  { country: "SG", city: "Singapore" },
];

const TARGET_URLS = [
  "https://www.youtube.com/",
  "https://github.com/",
  "https://www.google.com/",
  "https://gemini.google.com/",
  "https://www.facebook.com/",
  "https://www.instagram.com/",
  "https://vercel.com/",
  "https://render.com/",
];

async function main() {
  console.log(`🌱 Start seeding (Big Data Mode - Users + Anonymous Links)...`);

  const password = "User#123";
  const passwordHash = await bcrypt.hash(password, SECURITY?.SALT_ROUNDS || 10);

  // Clear Old Data
  await prisma.click.deleteMany({});
  await prisma.link.deleteMany({});
  await prisma.user.deleteMany({});

  // [---------- Create Main Users ----------]
  const admin = await prisma.user.create({
    data: {
      email: "admin@local.dev",
      passwordHash,
      role: USER_ROLES.ADMIN,
      provider: "LOCAL",
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "user@local.dev",
      passwordHash,
      role: USER_ROLES.USER,
      provider: "LOCAL",
      linkLimit: 50,
    },
  });

  console.log(`✅ Created Main Users: Admin & Demo User`);

  // [---------- Create Random Users & Links ----------]
  const users = [demoUser];
  const allLinks = [];

  // Create 10 Random Users
  // ใช้ Loop แบบเดิม (Sequential) เพราะจำนวนน้อยและเพื่อความง่ายในการ debug
  for (let i = 1; i <= 10; i++) {
    const isBlocked = Math.random() < 0.2; // 20% Blocked
    const userCreate = await prisma.user.create({
      data: {
        email: `user${i}@test.com`,
        passwordHash,
        role: USER_ROLES.USER,
        provider: "LOCAL",
        isBlocked: isBlocked,
      },
    });
    users.push(userCreate);
  }

  // Generate User Links
  for (const user of users) {
    const linkCount = randomInt(3, 8);
    for (let j = 0; j < linkCount; j++) {
      const isExpired = Math.random() > 0.9;

      // คำนวณวันหมดอายุ
      const expiryDays = isExpired ? -1 : DEFAULTS.USER_LINK_EXPIRY_DAYS;
      const expiredAt = addDays(new Date(), expiryDays);

      const slug = await generateSlug();

      const link = await prisma.link.create({
        data: {
          slug,
          targetUrl: randomElement(TARGET_URLS),
          ownerId: user.id,
          expiredAt: expiredAt,
          disabled: Math.random() > 0.9,
        },
      });
      allLinks.push(link);
    }
  }

  // Admin QR Link

  const slugAdmin = await generateSlug();

  const qrLink = await prisma.link.create({
    data: {
      slug: slugAdmin,
      targetUrl: "https://prisma.io",
      ownerId: admin.id,
      expiredAt: addDays(new Date(), 365), // 1 Year
      qrOptions: {
        dotsOptions: { color: "#E11D48", type: "dots" },
        backgroundOptions: { color: "#ffffff" },
      },
    },
  });
  allLinks.push(qrLink);

  // -----------------------------------------------------------------------
  // Create Anonymous Links
  // -----------------------------------------------------------------------
  console.log(`🔹 Creating Anonymous Links...`);
  const anonLinkCount = 20; // จำลองสัก 20 ลิงก์

  for (let i = 0; i < anonLinkCount; i++) {
    const isExpired = Math.random() > 0.5; // 50% ให้หมดอายุไปแล้ว (เพื่อเทส Cron Job ลบ)

    // ใช้ ANON_LINK_EXPIRY_DAYS (7 วัน) ตาม Config
    const expiryDays = isExpired ? -2 : DEFAULTS.ANON_LINK_EXPIRY_DAYS;
    const expiredAt = addDays(new Date(), expiryDays);

    const slug = await generateSlug();

    const link = await prisma.link.create({
      data: {
        slug,
        targetUrl: randomElement(TARGET_URLS),
        ownerId: null, // ไม่มีเจ้าของ
        expiredAt: expiredAt,
        disabled: false,
      },
    });
    allLinks.push(link);
  }

  console.log(
    `✅ Created ${users.length} Users and ${allLinks.length} Total Links (User + Anon)`
  );

  // -----------------------------------------------------------------------
  // Generate Clicks (Analytics Data)
  // -----------------------------------------------------------------------
  console.log(`⏳ Generating analytics data...`);

  const clicksData = [];
  const TOTAL_CLICKS = 2000;

  for (let i = 0; i < TOTAL_CLICKS; i++) {
    const link = randomElement(allLinks); // สุ่มคลิกทั้ง User Link และ Anon Link

    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, 30));
    date.setHours(randomInt(0, 23), randomInt(0, 59));

    const location = randomElement(LOCATIONS);

    clicksData.push({
      linkId: link.id,
      ip: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
      userAgent: randomElement(USER_AGENTS),
      referrer: randomElement(REFERRERS),
      country: location.country,
      city: location.city,
      createdAt: date,
    });
  }

  // ใช้ createMany เพื่อประสิทธิภาพ (Batch Insert)
  await prisma.click.createMany({
    data: clicksData,
  });

  console.log(`✅ Generated ${clicksData.length} clicks.`);
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
