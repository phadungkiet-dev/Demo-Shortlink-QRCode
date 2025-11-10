const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const saltRounds = 10;

  // Create Admin User
  const adminPassword = await bcrypt.hash("Admin#123", saltRounds);
  const admin = await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    update: {},
    create: {
      email: "admin@local.dev",
      passwordHash: adminPassword,
      provider: "LOCAL",
      role: "ADMIN",
    },
  });

  // Create Normal User
  const userPassword = await bcrypt.hash("User#123", saltRounds);
  const user = await prisma.user.upsert({
    where: { email: "user@local.dev" },
    update: {},
    create: {
      email: "user@local.dev",
      passwordHash: userPassword,
      provider: "LOCAL",
      role: "USER",
    },
  });

  console.log(`Created users:`, { admin, user });

  // Create links
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const link1 = await prisma.link.create({
    data: {
      slug: "google",
      targetUrl: "https://google.com",
      ownerId: user.id,
      expiredAt: thirtyDaysFromNow,
    },
  });

  const link2 = await prisma.link.create({
    data: {
      slug: "prisma",
      targetUrl: "https://prisma.io",
      ownerId: admin.id,
      expiredAt: thirtyDaysFromNow,
    },
  });

  // Anonymous link
  const link3 = await prisma.link.create({
    data: {
      slug: "anon-link",
      targetUrl: "https://github.com",
      ownerId: null, // No owner
      expiredAt: sevenDaysFromNow,
    },
  });

  console.log(`Created links:`, { link1, link2, link3 });

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
