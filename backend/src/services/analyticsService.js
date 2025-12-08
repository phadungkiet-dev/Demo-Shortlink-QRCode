const { prisma } = require("../config/prisma");
const AppError = require("../utils/AppError");
const { addDays, getNow } = require("../utils/time");

/**
 * Helper: ตรวจสอบว่า Timezone ถูกต้องหรือไม่ (ป้องกัน SQL Injection)
 */
const isValidTimezone = (tz) => {
  if (!tz) return false;
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
const getStatsForLink = async (linkId, ownerId, timezone) => {
  // Validate Timezone (Safety Check)
  // ใช้ค่าจาก ENV เป็นค่า Default หลัก ถ้า Client ไม่ส่งมาหรือส่งมาผิด
  const systemTz = process.env.TZ || "Asia/Bangkok";

  if (!isValidTimezone(timezone)) {
    timezone = systemTz;
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

      // Daily Graph (7 Days)
      // ใช้ SQL Raw เพื่อแปลง Timezone อย่างถูกต้อง
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

  // Format Data (Fill missing dates with 0)
  const dailyCounts = {};

  // Create last 7 days keys
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));

    // ใช้ toLocaleDateString แทน toISOString เพื่อให้ได้วันที่ตาม Timezone ที่เราต้องการ
    // 'en-CA' ให้ผลลัพธ์เป็น YYYY-MM-DD อัตโนมัติ
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: timezone });

    // ตั้งค่าเริ่มต้นเป็น 0 (ถ้า SQL มีข้อมูล มันจะมาทับค่านี้ทีหลัง)
    dailyCounts[dateStr] = 0;
  }

  // Map Actual Data
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
