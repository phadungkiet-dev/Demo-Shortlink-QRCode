const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");

/**
 * @function getStatsForLink
 * @description ดึงข้อมูลสถิติเชิงลึกของลิงก์ (กราฟ, Referrer, Device)
 * @param {number} linkId
 * @param {number} ownerId - ใช้ตรวจสอบสิทธิ์ความเป็นเจ้าของ
 */
const getStatsForLink = async (linkId, ownerId) => {
  // ตรวจสอบความเป็นเจ้าของ (Security)
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new AppError("Link not found or permission denied.", 404);
  }

  // ดึงยอดรวม
  const totalClicks = await prisma.click.count({
    where: { linkId },
  });

  // ดึงข้อมูลย้อนหลัง 7 วัน (สำหรับกราฟ)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // ดึง Log ทั้งหมดในช่วง 7 วัน (เลือกเฉพาะวันที่เพื่อประหยัด RAM)
  const recentClicks = await prisma.click.findMany({
    where: {
      linkId,
      createdAt: { gte: sevenDaysAgo },
    },
    select: { createdAt: true },
  });

  // Aggregate Data: แปลงเป็น format { "2023-10-25": 5, "2023-10-26": 12 }
  const dailyCounts = {};

  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    // format: YYYY-MM-DD
    timeZone: process.env.TZ || "Asia/Bangkok",
  });

  recentClicks.forEach((click) => {
    const dateKey = dateFormatter.format(click.createdAt); // ได้ค่า "2023-11-28" แบบ Local Time
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  // Top Referrers
  const topReferrers = await prisma.click.groupBy({
    by: ["referrer"],
    where: { linkId, referrer: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // Top Countries
  const topCountries = await prisma.click.groupBy({
    by: ["country"],
    where: { linkId, country: { not: null } }, // ไม่นับพวกหาไม่เจอ (null)
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  // Top User Agents (Optional: ลดเหลือ 5 เพื่อความสะอาด)
  const topUserAgents = await prisma.click.groupBy({
    by: ["userAgent"],
    where: { linkId, userAgent: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  return {
    link,
    totalClicks,
    dailyCounts,
    topReferrers: topReferrers.map((r) => ({
      referrer: r.referrer || "Direct / Unknown",
      count: r._count.id,
    })),
    // [New Data] ส่งกลับไป Frontend
    topCountries: topCountries.map((c) => ({
      country: c.country, // รหัสประเทศ เช่น 'TH'
      count: c._count.id,
    })),
    topUserAgents: topUserAgents.map((u) => ({
      userAgent: u.userAgent,
      count: u._count.id,
    })),
  };
};

module.exports = {
  getStatsForLink,
};
