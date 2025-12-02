const { Prisma } = require("@prisma/client");
const { prisma } = require("../config/prisma");
const { generateSlug } = require("../utils/slug");
const { addDays, getNow } = require("../utils/time");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const geoip = require("geoip-lite");
const storageService = require("./storageService");
const { DEFAULTS, USER_ROLES } = require("../config/constants");

const MAX_SLUG_RETRIES = 5;

// --- Main Service Functions ---
/**
 * @function createLink
 * @description สร้าง Short Link ใหม่
 * @param {string} targetUrl - URL ปลายทาง
 * @param {number|null} ownerId - ID เจ้าของ (null = Anonymous)
 * @param {string|null} customSlug - Slug ที่ผู้ใช้ตั้งเอง (Optional)
 */
const createLink = async (targetUrl, ownerId, customSlug = null) => {
  const now = getNow();
  const isAnonymous = ownerId === null;

  const expiryDays = isAnonymous
    ? DEFAULTS.ANON_LINK_EXPIRY_DAYS
    : DEFAULTS.USER_LINK_EXPIRY_DAYS;
  const expiredAt = addDays(now, expiryDays);

  // Check Quota (สำหรับ Logged-in User เท่านั้น)
  if (!isAnonymous) {
    // ดึงข้อมูล User เพื่อดู Limit และ Role
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { linkLimit: true, role: true },
    });

    // (Admin สร้างได้ไม่จำกัด Unlimited)
    if (user && user.role !== USER_ROLES.ADMIN) {
      const currentLinkCount = await prisma.link.count({
        where: { ownerId: ownerId },
      });

      const limit = user.linkLimit || DEFAULTS.LINK_LIMIT;

      if (currentLinkCount >= limit) {
        throw new AppError(
          `Limit reached! You have used ${currentLinkCount}/${limit} links. Please contact admin or upgrade.`,
          403 // Forbidden
        );
      }
    }
  }

  // กรณี Custom Slug
  if (customSlug) {
    const existing = await prisma.link.findUnique({
      where: { slug: customSlug },
    });
    if (existing) {
      throw new AppError("This custom alias is already taken.", 409);
    }

    return prisma.link.create({
      data: {
        slug: customSlug,
        targetUrl,
        ownerId,
        expiredAt,
      },
    });
  }

  // กรณี Auto Generated Slug (Retry Logic)
  let slug;
  let retries = 0;

  while (retries < MAX_SLUG_RETRIES) {
    slug = await generateSlug(isAnonymous ? 6 : 7);
    retries++;

    try {
      const link = await prisma.link.create({
        data: {
          slug,
          targetUrl,
          ownerId,
          expiredAt,
        },
      });
      return link;
    } catch (e) {
      // P2002 = Unique constraint failed (Slug ซ้ำ)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        logger.warn(
          `Slug collision detected: ${slug}. Retrying... (${retries}/${MAX_SLUG_RETRIES})`
        );
        continue;
      }
      throw e;
    }
  }

  throw new AppError(
    "Failed to generate a unique link. Please try again.",
    500
  );
};

/**
 * @function findLinksByOwner
 * @description ดึงลิงก์ทั้งหมดของ User พร้อม Pagination และ Search
 */
const findLinksByOwner = async (
  ownerId,
  page = 1,
  limit = 9,
  search = "",
  status = "ALL"
) => {
  const skip = (page - 1) * limit;
  const now = getNow();

  const baseWhere = { ownerId };
  const andConditions = [];

  // Search
  if (search) {
    andConditions.push({
      OR: [
        { targetUrl: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // Status Filter (Active / Inactive)
  if (status === "ACTIVE") {
    andConditions.push({
      disabled: false,
      expiredAt: { gt: now },
    });
  } else if (status === "INACTIVE") {
    andConditions.push({
      OR: [
        { disabled: true },
        { expiredAt: { lte: now } }, // หมดอายุถือว่า Inactive
      ],
    });
  }

  // รวมเงื่อนไข
  if (andConditions.length > 0) {
    baseWhere.AND = andConditions;
  }

  const [totalMatched, links, totalLinks, activeLinks] =
    await prisma.$transaction([
      prisma.link.count({ where: baseWhere }),

      prisma.link.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { clicks: true } } },
      }),

      prisma.link.count({ where: { ownerId } }),

      prisma.link.count({
        where: {
          ownerId,
          disabled: false,
          expiredAt: { gt: now },
        },
      }),
    ]);

  return {
    links,
    meta: {
      total: totalMatched,
      page,
      limit,
      totalPages: Math.ceil(totalMatched / limit) || 1,
    },
    stats: {
      total: totalLinks,
      active: activeLinks,
      inactive: totalLinks - activeLinks,
    },
  };
};

/**
 * Helper: ดึง Relative Path จาก URL
 * Input: http://localhost:3001/uploads/logos/slug/file.png
 * Output: slug/file.png
 */
const getRelativePath = (fullUrl) => {
  if (!fullUrl || !fullUrl.includes("/uploads/logos/")) return null;
  return fullUrl.split("/uploads/logos/")[1];
};

/**
 * @function updateLink
 * @description แก้ไขลิงก์ (URL, QR Options, Status, Renew)
 */
const updateLink = async (linkId, ownerId, data) => {
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new AppError("Link not found or you do not have permission.", 404);
  }

  let updateData = {};

  if (data.targetUrl) updateData.targetUrl = data.targetUrl;
  if (data.disabled !== undefined) updateData.disabled = data.disabled;

  if (data.renew) {
    const now = getNow();
    updateData.expiredAt = addDays(now, DEFAULTS.USER_LINK_EXPIRY_DAYS);
    updateData.disabled = false;
  }

  if (data.qrOptions) {
    let finalOptions = { ...data.qrOptions };

    // ดึง URL เก่าจาก DB
    const oldImage =
      typeof link.qrOptions === "object" && link.qrOptions !== null
        ? link.qrOptions.image
        : null;

    let newImage = finalOptions.image;

    if (
      newImage &&
      typeof newImage === "string" &&
      newImage.startsWith("data:image")
    ) {
      try {
        // บันทึกรูปใหม่
        const logoUrl = await storageService.saveImage(link.slug, newImage);

        if (logoUrl) {
          finalOptions.image = logoUrl; // ใช้ URL ใหม่

          const oldPath = getRelativePath(oldImage);
          if (oldPath) await storageService.deleteImage(oldPath);
        }
      } catch (err) {
        logger.error(`Failed to save logo for link ${link.slug}:`, err);
        // ถ้าเซฟรูปไม่ผ่าน ก็ใช้รูปเดิมไปก่อน หรือจะ throw error ก็ได้
      }
    } else if (newImage === null) {
      // [Cleanup] ลบรูปเก่าทิ้ง
      const oldPath = getRelativePath(oldImage);
      if (oldPath) await storageService.deleteImage(oldPath);
      finalOptions.image = null; // เคลียร์ค่าใน DB
    }

    updateData.qrOptions = finalOptions;
  }

  if (Object.keys(updateData).length === 0) return link;

  return prisma.link.update({
    where: { id: linkId },
    data: updateData,
  });
};

/**
 * @function deleteLink
 * @description ลบลิงก์ถาวร
 */
const deleteLink = async (linkId, ownerId) => {
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new AppError("Link not found or you do not have permission.", 404);
  }

  if (
    link.qrOptions &&
    typeof link.qrOptions === "object" &&
    link.qrOptions.image
  ) {
    const imagePath = getRelativePath(link.qrOptions.image);
    if (imagePath) await storageService.deleteImage(imagePath);
  }

  await prisma.link.delete({ where: { id: linkId } });

  return { message: "Link deleted successfully." };
};

/**
 * @function getAndRecordClick
 * @description ดึง URL ปลายทาง และบันทึกสถิติการคลิก (ใช้โดย Redirect Controller)
 */
const getAndRecordClick = async (slug, ip, uaString, referrer) => {
  const now = getNow();
  const link = await prisma.link.findUnique({ where: { slug } });

  if (!link || link.disabled || link.expiredAt <= now) return null;

  // Resolve Geo Location from IP
  let country = null;
  let city = null;

  try {
    // geoip.lookup อาจคืนค่า null ถ้าหาไม่เจอ (เช่น Localhost 127.0.0.1)
    const geo = geoip.lookup(ip);
    if (geo) {
      country = geo.country; // e.g., 'TH', 'US'
      city = geo.city; // e.g., 'Bangkok'
    }
  } catch (err) {
    logger.warn(`GeoIP lookup failed for IP ${ip}:`, err);
  }

  prisma.click
    .create({
      data: {
        linkId: link.id,
        ip,
        userAgent: uaString,
        referrer: referrer || null,
        country, // บันทึกประเทศ
        city, // บันทึกเมือง
      },
    })
    .catch((err) => {
      logger.error(`Failed to record click for ${slug}:`, err);
    });

  return link.targetUrl;
};

/**
 * @function deleteExpiredAnonymousLinks
 * @description Cron Job function เพื่อลบลิงก์ขยะ
 */
const deleteExpiredAnonymousLinks = async () => {
  const now = getNow();
  const result = await prisma.link.deleteMany({
    where: {
      ownerId: null,
      expiredAt: { lte: now },
    },
  });
  return result.count;
};

module.exports = {
  createLink,
  findLinksByOwner,
  updateLink,
  deleteLink,
  getAndRecordClick,
  deleteExpiredAnonymousLinks,
};
