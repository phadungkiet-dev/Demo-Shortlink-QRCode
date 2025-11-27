const { prisma } = require("../config/prisma");
const { generateSlug } = require("../utils/slug");
const { addDays, getNow } = require("../utils/time");
const { Prisma } = require("@prisma/client");
const logger = require("../utils/logger");
const useragent = require("useragent");

const fs = require("fs/promises"); // ใช้ fs แบบ Promise เพื่อความทันสมัย
const path = require("path");

// โฟลเดอร์เก็บรูปโลโก้
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

// Helper: บันทึกรูปจาก Base64 ลงไฟล์
const saveLogoFile = async (slug, base64String) => {
  await ensureLogoDir();

  // แยก Header (data:image/png;base64,...) ออกจากเนื้อข้อมูล
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return null;
  }

  const extension = matches[1].split("/")[1]; // เช่น png
  const imageBuffer = Buffer.from(matches[2], "base64");
  const filename = `${slug}-${Date.now()}.${extension}`; // ตั้งชื่อไฟล์ให้ไม่ซ้ำ
  const filePath = path.join(LOGO_DIR, filename);

  await fs.writeFile(filePath, imageBuffer);

  // คืนค่าเป็น URL สำหรับเรียกใช้งาน
  return `${process.env.BASE_URL}/uploads/logos/${filename}`;
};

// สร้าง Shortlink
const createLink = async (targetUrl, ownerId, customSlug = null) => {
  const now = getNow();
  const isAnonymous = ownerId === null;

  // Anonymous อยู่ได้ 7 วัน, สมาชิกอยู่ได้ 30 วัน
  const expiryDays = isAnonymous ? 7 : 30;
  const expiredAt = addDays(now, expiryDays);

  if (!isAnonymous) {
    // 1. ดึงข้อมูล User เพื่อดู limit ของเขา
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { linkLimit: true }, // ดึงมาแค่ค่า limit
    });

    // 2. นับจำนวนลิงก์ที่เขามีตอนนี้
    const currentLinkCount = await prisma.link.count({
      where: { ownerId: ownerId },
    });

    // 3. เปรียบเทียบ (ถ้าหา user ไม่เจอ ให้ใช้ค่า default 10 กันเหนียว)
    const limit = user?.linkLimit || 10;

    if (currentLinkCount >= limit) {
      throw new Error(
        `Limit reached! You have used ${currentLinkCount}/${limit} links. Please contact admin to increase your quota.`
      );
    }
  }

  // กรณีตั้งชื่อเอง (Custom Slug)
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

  // กรณีสุ่มชื่อ (Auto Slug) - มีระบบ Retry ถ้าซ้ำ
  let slug;
  let retries = 0;
  let linkCreated = false;

  // Retry loop for unique slug generation
  while (!linkCreated) {
    if (retries >= MAX_SLUG_RETRIES) {
      throw new Error("Failed to generate a unique slug. Please try again.");
    }

    slug = generateSlug(isAnonymous ? 5 : 7); // สั้นกว่าสำหรับ Anonymous
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
      // P2002 คือ Error ข้อมูลซ้ำ (Slug ชนกัน) -> ให้วนลูปใหม่
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        // Unique constraint violation (slug already exists)
        logger.warn(`Slug collision: ${slug}. Retrying... (${retries})`);
      } else {
        throw e; // Error อื่นให้โยนออกไป
      }
    }
  }
};

// ดึงลิงก์ปลายทาง + บันทึกสถิติ
const getAndRecordClick = async (slug, ip, uaString, referrer) => {
  const now = getNow();

  const link = await prisma.link.findUnique({
    where: { slug },
  });

  // เช็คว่าลิงก์มีอยู่จริง / ไม่ถูกปิด / ไม่หมดอายุ
  if (!link || link.disabled || link.expiredAt <= now) {
    logger.warn(
      `Link access failed: ${slug} (Found: ${!!link}, Disabled: ${
        link?.disabled
      }, Expired: ${link?.expiredAt <= now})`
    );
    return null;
  }

  // *Performance Trick* บันทึก Click แบบไม่ต้องรอ (Fire-and-forget)
  // เพื่อให้ User ได้ Redirect เร็วที่สุด
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

// Finds links by owner ID.
const findLinksByOwner = async (ownerId, page = 1, limit = 9, search = "") => {
  const skip = (page - 1) * limit;
  const now = getNow();

  // 1. สร้างเงื่อนไขการค้นหา (Base Where Clause)
  const baseWhere = { ownerId };

  // ถ้ามี search ให้เพิ่มเงื่อนไข OR
  if (search) {
    baseWhere.AND = {
      OR: [
        { targetUrl: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  // 2. ดึงข้อมูล (Transaction)
  // เราต้องนับแยก:
  // - totalMatched: จำนวนที่ตรงกับ Search (ใช้ทำ Pagination)
  // - stats: สถิติภาพรวมของ User (ไม่สน Search) เพื่อโชว์ใน Cards
  const [totalMatched, links, totalLinks, activeLinks] =
    await prisma.$transaction([
      // A. นับจำนวนที่ตรงกับ Search (เพื่อทำ Pagination)
      prisma.link.count({ where: baseWhere }),

      // B. ดึงข้อมูลลิงก์ (Pagination + Search)
      prisma.link.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { clicks: true } } },
      }),

      // C. นับลิงก์ทั้งหมดของ User (ไม่สน Search)
      prisma.link.count({ where: { ownerId } }),

      // D. นับลิงก์ที่ Active (ไม่สน Search)
      prisma.link.count({
        where: {
          ownerId,
          disabled: false,
          expiredAt: { gt: now },
        },
      }),
    ]);

  // คำนวณ Inactive
  const inactiveLinks = totalLinks - activeLinks;

  return {
    links,
    meta: {
      total: totalMatched, // ใช้สำหรับคำนวณหน้า (Page 1 of X)
      page,
      limit,
      totalPages: Math.ceil(totalMatched / limit),
    },
    // ส่งสถิติแยกออกมาต่างหาก
    stats: {
      total: totalLinks,
      active: activeLinks,
      inactive: inactiveLinks,
    },
  };
};

// อัปเดตลิงก์ (เปลี่ยน URL, ต่ออายุ, แก้ QR)
const updateLink = async (linkId, ownerId, data) => {
  const link = await prisma.link.findFirst({ where: { id: linkId, ownerId } });
  if (!link) throw new Error("Link not found...");

  let updateData = {};

  // จัดการรูป QR (ถ้ามีการอัปโหลดใหม่)
  if (data.qrOptions) {
    // Copy object มาเพื่อแก้ไข
    let finalOptions = { ...data.qrOptions };

    // เช็คว่าเป็น Base64 รูปใหม่หรือไม่?
    if (finalOptions.image && finalOptions.image.startsWith("data:image")) {
      try {
        const logoUrl = await saveLogoFile(link.slug, finalOptions.image);
        if (logoUrl) {
          finalOptions.image = logoUrl;
        }
      } catch (err) {
        console.error("Failed to save logo:", err);
      }
    }

    // บันทึกลง DB (Prisma field Json)
    updateData.qrOptions = finalOptions;
  }

  if (data.disabled !== undefined) {
    updateData.disabled = data.disabled;
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

// ลบลิงก์
const deleteLink = async (linkId, ownerId) => {
  // ต้องเช็ค ownerId เสมอ เพื่อไม่ให้ลบของคนอื่น
  const link = await prisma.link.findFirst({
    where: { id: linkId, ownerId },
  });

  if (!link) {
    throw new Error("Link not found or user does not have permission.");
  }

  // ลบรูป Logo เก่าทิ้งด้วย (ถ้ามี) -> ควรเพิ่ม Logic นี้
  // await deleteQrConfig(link.slug);

  await prisma.link.delete({
    where: { id: linkId },
  });

  return { message: "Link deleted successfully." };
};

// ลบลิงก์ขยะ (Anonymous หมดอายุ) สำหรับ Cron Job
const deleteExpiredAnonymousLinks = async () => {
  const now = getNow();
  const result = await prisma.link.deleteMany({
    where: {
      ownerId: null,
      expiredAt: {
        lte: now, // น้อยกว่าหรือเท่ากับตอนนี้
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
