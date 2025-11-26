const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");

const getStatsForLink = async (linkId, ownerId) => {
  // ตรวจสอบความเป็นเจ้าของก่อน (Security First)
  const link = await prisma.link.findFirst({
    where: {
      id: linkId,
      ownerId: ownerId,
    },
  });

  if (!link) {
    throw new Error("Link not found or user does not have permission.");
  }

  // นับยอดคลิกรวม
  const totalClicks = await prisma.click.count({
    where: { linkId: linkId },
  });

  // เตรียมข้อมูลกราฟเส้น (ยอดคลิกย้อนหลัง 7 วัน)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const clicksOverTime = await prisma.click.groupBy({
    by: ["createdAt"], // This is not ideal, should be truncated
    where: {
      linkId: linkId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // ดึง Log ทั้งหมดใน 7 วันมา (เลือกเฉพาะ field วันที่เพื่อความเบา)
  const clicksByDay = await prisma.click.findMany({
    where: {
      linkId: linkId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      createdAt: true,
    },
  });

  // Group ข้อมูลตามวัน (YYYY-MM-DD) ด้วย JavaScript
  const dailyCounts = {};
  clicksByDay.forEach((click) => {
    const day = click.createdAt.toISOString().split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });

  // หา Top 10 Referrers (มาจากเว็บไหนบ้าง?)
  const topReferrers = await prisma.click.groupBy({
    by: ["referrer"],
    where: {
      linkId: linkId,
      referrer: {
        not: null,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });

  // หา Top 5 User Agents (ใช้อุปกรณ์อะไร?)
  const topUserAgents = await prisma.click.groupBy({
    by: ["userAgent"],
    where: {
      linkId: linkId,
      userAgent: {
        not: null,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 5,
  });

  return {
    link,
    totalClicks,
    dailyCounts,
    topReferrers: topReferrers.map((r) => ({
      referrer: r.referrer || "Direct",
      count: r._count.id,
    })),
    topUserAgents: topUserAgents.map((ua) => ({
      userAgent: ua.userAgent,
      count: ua._count.id,
    })),
  };
};

module.exports = {
  getStatsForLink,
};
