const { prisma } = require("../config/prisma");
const logger = require("../utils/logger");

/**
 * Gets aggregated stats for a specific link, checking ownership.
 * @param {number} linkId
 * @param {number} ownerId
 * @returns {Promise<object>}
 */
const getStatsForLink = async (linkId, ownerId) => {
  // 1. Verify ownership and get link info
  const link = await prisma.link.findFirst({
    where: {
      id: linkId,
      ownerId: ownerId,
    },
  });

  if (!link) {
    throw new Error("Link not found or user does not have permission.");
  }

  // 2. Get total clicks
  const totalClicks = await prisma.click.count({
    where: { linkId: linkId },
  });

  // 3. Get clicks over time (e.g., last 7 days)
  // This is a simplified example. A real app might use complex GROUP BY date_trunc
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

  // A better way for clicks over time (requires raw query or view)
  // For simplicity, we'll just group by day (in code, not ideal)
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

  // Process in JS (simpler than complex SQL/Prisma groupBy date_trunc)
  const dailyCounts = {};
  clicksByDay.forEach((click) => {
    const day = click.createdAt.toISOString().split("T")[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });

  // 4. Get top referrers
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

  // 5. Get top User Agents (simplified)
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
