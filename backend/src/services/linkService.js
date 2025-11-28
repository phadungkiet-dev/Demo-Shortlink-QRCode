const { Prisma } = require("@prisma/client");
const fs = require("fs/promises");
const path = require("path");
const { prisma } = require("../config/prisma");
const { generateSlug } = require("../utils/slug");
const { addDays, getNow } = require("../utils/time");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

// Config
const LOGO_DIR = path.join(__dirname, "../../storage/logos");
const MAX_SLUG_RETRIES = 5;

// --- Internal Helper Functions ---

/**
 * @function ensureLogoDir
 * @description ตรวจสอบและสร้างโฟลเดอร์เก็บ Logo หากยังไม่มี
 */
const ensureLogoDir = async () => {
  try {
    await fs.access(LOGO_DIR);
  } catch {
    await fs.mkdir(LOGO_DIR, { recursive: true });
  }
};

/**
 * @function saveLogoFile
 * @description แปลง Base64 Image เป็นไฟล์และบันทึกลง Disk
 * @param {string} slug - Slug ของลิงก์ (ใช้ตั้งชื่อไฟล์)
 * @param {string} base64String - ข้อมูลรูปภาพแบบ Base64
 * @returns {Promise<string|null>} - URL path ของรูปภาพ
 */
const saveLogoFile = async (slug, base64String) => {
  if (!base64String || !base64String.startsWith("data:image")) return null;

  await ensureLogoDir();

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return null;

  const extension = matches[1].split("/")[1];
  const imageBuffer = Buffer.from(matches[2], "base64");

  const filename = `${slug}-${Date.now()}.${extension}`;
  const filePath = path.join(LOGO_DIR, filename);

  await fs.writeFile(filePath, imageBuffer);

  return `${process.env.BASE_URL}/uploads/logos/${filename}`;
};

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
  const expiryDays = isAnonymous ? 7 : 30;
  const expiredAt = addDays(now, expiryDays);

  // 1. Check Quota (สำหรับ Logged-in User เท่านั้น)
  if (!isAnonymous) {
    // ดึงข้อมูล User เพื่อดู Limit และ Role
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { linkLimit: true, role: true }, // +++ เพิ่ม role มาเช็ค
    });

    // +++ ถ้าไม่ใช่ Admin ถึงจะทำการเช็ค Quota +++
    // (Admin สร้างได้ไม่จำกัด Unlimited)
    if (user && user.role !== "ADMIN") {
      const currentLinkCount = await prisma.link.count({
        where: { ownerId: ownerId },
      });

      const limit = user.linkLimit || 10;

      if (currentLinkCount >= limit) {
        throw new AppError(
          `Limit reached! You have used ${currentLinkCount}/${limit} links. Please contact admin or upgrade.`,
          403 // Forbidden
        );
      }
    }
  }

  // 2. กรณี Custom Slug
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
        isPublic: false,
      },
    });
  }

  // 3. กรณี Auto Generated Slug (Retry Logic)
  let slug;
  let retries = 0;

  while (retries < MAX_SLUG_RETRIES) {
    slug = generateSlug(isAnonymous ? 5 : 7);
    retries++;

    try {
      const link = await prisma.link.create({
        data: {
          slug,
          targetUrl,
          ownerId,
          expiredAt,
          isPublic: false,
        },
      });
      return link;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        logger.warn(
          `Slug collision detected: ${slug}. Retrying... (${retries})`
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
const findLinksByOwner = async (ownerId, page = 1, limit = 9, search = "") => {
  const skip = (page - 1) * limit;
  const now = getNow();

  const baseWhere = { ownerId };
  if (search) {
    baseWhere.AND = {
      OR: [
        { targetUrl: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    };
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
    updateData.expiredAt = addDays(now, 30);
    updateData.disabled = false;
  }

  if (data.qrOptions) {
    let finalOptions = { ...data.qrOptions };
    if (finalOptions.image && finalOptions.image.startsWith("data:image")) {
      try {
        const logoUrl = await saveLogoFile(link.slug, finalOptions.image);
        if (logoUrl) finalOptions.image = logoUrl;
      } catch (err) {
        logger.error(`Failed to save logo for link ${link.slug}:`, err);
      }
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
        ip: ip,
        userAgent: uaString,
        referrer: referrer || null,
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
