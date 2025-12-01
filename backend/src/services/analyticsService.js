const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");

/**
 * @function getStatsForLink
 * @description ดึงข้อมูลสถิติเชิงลึกของลิงก์ (High Performance Version)
 * เปลี่ยนจากการดึง Raw Data มา Process เอง เป็นการใช้ DB Aggregation เพื่อลดภาระ RAM
 * @param {number} linkId
 * @param {number} ownerId - ใช้ตรวจสอบสิทธิ์ความเป็นเจ้าของ
 */

const getStatsForLink = async (linkId, ownerId) => {
  // ตรวจสอบความเป็นเจ้าของ (Security Check)
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new AppError("Link not found or permission denied.", 404);
  }

  // กำหนดช่วงเวลา (7 วันย้อนหลัง)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Parallel Queries (ยิง Query ไป Database พร้อมกัน 5 ทาง เพื่อความเร็วสูงสุด)
  const [totalClicks, dailyStatsRaw, topReferrers, topCountries, topBrowsers] =
    await Promise.all([
      // ยอดรวมคลิกทั้งหมด
      prisma.click.count({ where: { linkId } }),

      // กราฟ 7 วันย้อนหลัง (ใช้ SQL ตรงๆ เพื่อประสิทธิภาพสูงสุดในการตัดเวลา)
      prisma.$queryRaw`
      SELECT 
        TO_CHAR(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') as date, 
        COUNT(*)::int as count 
      FROM clicks 
      WHERE link_id = ${linkId} AND created_at >= ${sevenDaysAgo}
      GROUP BY date 
      ORDER BY date ASC
    `,

      // Top Referrers (10 อันดับ)
      prisma.click.groupBy({
        by: ["referrer"],
        where: { linkId, referrer: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Top Countries (5 อันดับ)
      prisma.click.groupBy({
        by: ["country"],
        where: { linkId, country: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),

      // Top User Agents
      prisma.click.groupBy({
        by: ["userAgent"],
        where: { linkId, userAgent: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

  // จัดรูปแบบข้อมูลก่อนส่งให้ Frontend
  const dailyCounts = {};
  dailyStatsRaw.forEach((item) => {
    dailyCounts[item.date] = item.count;
  });

  return {
    link,
    totalClicks,
    dailyCounts,
    topReferrers: topReferrers.map((r) => ({
      referrer: r.referrer || "Direct / Unknown",
      count: r._count.id,
    })),
    topCountries: topCountries.map((c) => ({
      country: c.country || "Unknown",
      count: c._count.id,
    })),
    topUserAgents: topBrowsers.map((u) => ({
      userAgent: u.userAgent
        ? u.userAgent.substring(0, 50) + (u.userAgent.length > 50 ? "..." : "")
        : "Unknown",
      count: u._count.id,
    })),
  };
};

module.exports = {
  getStatsForLink,
};
