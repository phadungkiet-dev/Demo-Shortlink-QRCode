const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");

/**
 * @function getStatsForLink
 * @description ดึงข้อมูลสถิติเชิงลึกของลิงก์ (กราฟ, Referrer, Device)
 * @param {number} linkId
 * @param {number} ownerId - ใช้ตรวจสอบสิทธิ์ความเป็นเจ้าของ
 */
const getStatsForLink = async (linkId, ownerId) => {
  // 1. ตรวจสอบความเป็นเจ้าของ (Security)
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new AppError("Link not found or permission denied.", 404);
  }

  // 2. ดึงยอดรวม
  const totalClicks = await prisma.click.count({
    where: { linkId },
  });

  // 3. ดึงข้อมูลย้อนหลัง 7 วัน (สำหรับกราฟ)
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
  recentClicks.forEach((click) => {
    // ใช้ toISOString().split('T')[0] เพื่อให้ได้ YYYY-MM-DD ที่เป็นมาตรฐาน (UTC)
    // หมายเหตุ: ถ้าต้องการตาม Timezone ไทย อาจต้องใช้ library 'date-fns-tz' หรือคำนวณ offset
    const dateKey = click.createdAt.toISOString().split("T")[0];
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  // 4. Top Referrers
  const topReferrers = await prisma.click.groupBy({
    by: ["referrer"],
    where: { linkId, referrer: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // 5. Top User Agents
  const topUserAgents = await prisma.click.groupBy({
    by: ["userAgent"],
    where: { linkId, userAgent: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });

  return {
    link, // ส่งข้อมูลลิงก์กลับไปด้วย (เผื่อ Frontend อยากแสดงชื่อ/URL)
    totalClicks,
    dailyCounts,
    topReferrers: topReferrers.map((r) => ({
      referrer: r.referrer || "Direct",
      count: r._count.id,
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
