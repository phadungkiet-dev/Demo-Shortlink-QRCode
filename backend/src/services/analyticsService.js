const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const { addDays, getNow } = require("../utils/time");

/**
 * Helper: ตรวจสอบว่า Timezone ถูกต้องหรือไม่ (ป้องกัน SQL Injection)
 */
const isValidTimezone = (tz) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (ex) {
    return false;
  }
};

/**
 * @function getStatsForLink
 * @description ดึงข้อมูลสถิติเชิงลึกของลิงก์ (High Performance Version)
 */
const getStatsForLink = async (linkId, ownerId, timezone = "Asia/Bangkok") => {
  // Validate Timezone (Safety Check)
  if (!isValidTimezone(timezone)) {
    timezone = "Asia/Bangkok"; // Fallback to default if invalid
  }

  // ตรวจสอบความเป็นเจ้าของ (linkId และ ownerId เป็น UUID String)
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new AppError("Link not found or permission denied.", 404);
  }

  // กำหนดช่วงเวลา (7 วันย้อนหลัง)
  // ใช้ getNow() และ addDays() เพื่อความ consistency
  const now = getNow();
  const sevenDaysAgo = addDays(now, -7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Parallel Queries
  const [totalClicks, dailyStatsRaw, topReferrers, topCountries, topBrowsers] =
    await Promise.all([
      // Total Clicks
      prisma.click.count({ where: { linkId } }),

      // Daily Graph (7 Days) - Raw SQL for Timezone conversion
      // หมายเหตุ: Prisma ป้องกัน SQL Injection สำหรับ parameter ${...} ทั่วไป
      // แต่ชื่อ Timezone อาจต้องระวัง เราจึง validate ข้างบนแล้ว
      prisma.$queryRaw`
        SELECT 
          TO_CHAR(created_at AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}, 'YYYY-MM-DD') as date, 
          COUNT(*)::int as count 
        FROM clicks 
        WHERE link_id = ${linkId} AND created_at >= ${sevenDaysAgo}
        GROUP BY date 
        ORDER BY date ASC
      `,

      // Top Referrers
      prisma.click.groupBy({
        by: ["referrer"],
        where: { linkId, referrer: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),

      // Top Countries
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

  // Format Data
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
