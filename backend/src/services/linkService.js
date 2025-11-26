const { prisma } = require("../config/prisma");
const { generateSlug } = require("../utils/slug");
const { addDays, getNow } = require("../utils/time");
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");
const useragent = require("useragent");

const fs = require("fs/promises");
const path = require("path");

const LOGO_DIR = path.join(__dirname, "../../storage/logos");

const MAX_SLUG_RETRIES = 5;

// Helper: สร้างโฟลเดอร์ถ้ายังไม่มี
const ensureLogoDir = async () => {
  try {
    await fs.access(LOGO_DIR);
  } catch {
    await fs.mkdir(LOGO_DIR, { recursive: true });
  }
};

// Helper: บันทึกไฟล์รูปจาก Base64
const saveLogoFile = async (slug, base64String) => {
  await ensureLogoDir();

  // 1. แยก Header (data:image/png;base64,...) ออกจากตัวข้อมูล
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null; // ไม่ใช่ Base64 ที่ถูกต้อง
  }

  const extension = matches[1].split("/")[1]; // เช่น png, jpeg
  const imageBuffer = Buffer.from(matches[2], "base64");
  const filename = `${slug}-${Date.now()}.${extension}`; // เพิ่ม timestamp กัน cache
  const filePath = path.join(LOGO_DIR, filename);

  // 2. เขียนลงไฟล์
  await fs.writeFile(filePath, imageBuffer);

  // 3. คืนค่า URL (ต้องแก้ BASE_URL ใน .env ให้ถูกต้องด้วย)
  return `${process.env.BASE_URL}/uploads/logos/${filename}`;
};

/**
 * Creates a short link.
 * @param {string} targetUrl The target URL.
 * @param {number|null} ownerId The user ID if logged in, null otherwise.
 * @returns {Promise<import('@prisma/client').Link>}
 */
const createLink = async (targetUrl, ownerId, customSlug = null) => {
  const now = getNow();
  const isAnonymous = ownerId === null;

  const expiryDays = isAnonymous ? 7 : 30;
  const expiredAt = addDays(now, expiryDays);

  if (customSlug) {
    const existing = await prisma.link.findUnique({
      where: { slug: customSlug },
    });

    if (existing) {
      throw new Error("This custom alias is already taken.");
    }

    return prisma.link.create({
      data: {
        slug: customSlug,
        targetUrl,
        ownerId,
        expiredAt,
        isPublic: false,
        disabled: false,
      },
    });
  }

  let slug;
  let retries = 0;
  let linkCreated = false;

  // Retry loop for unique slug generation
  while (!linkCreated) {
    if (retries >= MAX_SLUG_RETRIES) {
      throw new Error("Failed to generate a unique slug. Please try again.");
    }

    slug = generateSlug(isAnonymous ? 5 : 7); // Shorter slugs for anon?
    retries++;

    try {
      const link = await prisma.link.create({
        data: {
          slug,
          targetUrl,
          ownerId,
          expiredAt,
          isPublic: false,
          disabled: false,
        },
      });
      linkCreated = true;
      return link;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Unique constraint violation (slug already exists)
        logger.warn(`Slug collision: ${slug}. Retrying... (${retries})`);
      } else {
        throw e; // Re-throw other errors
      }
    }
  }
};

/**
 * Finds a link by slug, checks validity, and records the click.
 * @param {string} slug
 * @param {string} ip
 * @param {string} uaString
 * @param {string} referrer
 * @returns {Promise<string|null>} Target URL or null if not found/expired.
 */
const getAndRecordClick = async (slug, ip, uaString, referrer) => {
  const now = getNow();

  const link = await prisma.link.findUnique({
    where: { slug },
  });

  if (!link || link.disabled || link.expiredAt <= now) {
    logger.warn(
      `Link access failed: ${slug} (Found: ${!!link}, Disabled: ${
        link?.disabled
      }, Expired: ${link?.expiredAt <= now})`
    );
    return null;
  }

  // Record click asynchronously (don't make the user wait)
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
      logger.error(`Failed to record click for link ${link.id}:`, err);
    });

  return link.targetUrl;
};

/**
 * Finds links by owner ID.
 */
const findLinksByOwner = async (ownerId) => {
  return prisma.link.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { clicks: true } } },
  });
};

/**
 * Updates a link (e.g., renews).
 * @param {number} linkId
 * @param {number} ownerId
 * @param {object} data - e.g., { renew: true }
 * @returns {Promise<import('@prisma/client').Link>}
 */
const updateLink = async (linkId, ownerId, data) => {
  const link = await prisma.link.findFirst({ where: { id: linkId, ownerId } });
  if (!link) throw new Error("Link not found...");

  let updateData = {};

  // +++ Logic จัดการ qrOptions +++
  if (data.qrOptions) {
    // Copy object มาเพื่อแก้ไข
    let finalOptions = { ...data.qrOptions };

    // เช็คว่ามีรูปส่งมาไหม และเป็น Base64 หรือเปล่า (ถ้าเป็น URL แล้วแสดงว่าเป็นรูปเดิม)
    if (finalOptions.image && finalOptions.image.startsWith("data:image")) {
      try {
        const logoUrl = await saveLogoFile(link.slug, finalOptions.image);
        if (logoUrl) {
          finalOptions.image = logoUrl; // เปลี่ยน Base64 เป็น URL
        }
      } catch (err) {
        console.error("Failed to save logo:", err);
        // ถ้าเซฟรูปไม่ผ่าน อาจจะยอมให้บันทึกโดยไม่มีรูป หรือ throw error ก็ได้
      }
    }

    // บันทึกลง DB (Prisma field Json)
    updateData.qrOptions = finalOptions;
  }

  if (data.renew) {
    /* ...Logic Renew... */
  }
  if (data.targetUrl) {
    updateData.targetUrl = data.targetUrl;
  }

  if (Object.keys(updateData).length === 0) return link;

  return prisma.link.update({
    where: { id: linkId },
    data: updateData,
  });
};

/**
 * Deletes a link.
 * @param {number} linkId
 * @param {number} ownerId
 */
const deleteLink = async (linkId, ownerId) => {
  // Verify ownership
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new Error("Link not found or user does not have permission.");
  }

  await deleteQrConfig(link.slug);

  // We use onDelete: Cascade in schema.prisma, so clicks are deleted too.
  await prisma.link.delete({
    where: { id: linkId },
  });

  return { message: "Link deleted successfully." };
};

/**
 * Deletes expired links that have no owner (anonymous).
 * @returns {Promise<number>} Count of deleted links.
 */
const deleteExpiredAnonymousLinks = async () => {
  const now = getNow();
  const result = await prisma.link.deleteMany({
    where: {
      ownerId: null,
      expiredAt: {
        lte: now, // Less than or equal to now
      },
    },
  });
  return result.count;
};

module.exports = {
  createLink,
  getAndRecordClick,
  findLinksByOwner,
  updateLink,
  deleteLink,
  deleteExpiredAnonymousLinks,
};
