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
const findLinksByOwner = async (ownerId, page = 1, limit = 9) => {
  const skip = (page - 1) * limit; // คำนวณจุดเริ่มต้น (Offset)

  // ใช้ $transaction เพื่อทำ 2 คำสั่งพร้อมกัน (ดึงของ + นับจำนวน)
  const [total, links] = await prisma.$transaction([
    // 1. นับจำนวนลิงก์ทั้งหมดของ User นี้
    prisma.link.count({ where: { ownerId } }),

    // 2. ดึงข้อมูลลิงก์ตามจำนวนที่ขอ (Pagination)
    prisma.link.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      skip: skip, // ข้ามไปกี่อัน
      take: limit, // เอามาปี่อัน
      include: { _count: { select: { clicks: true } } },
    }),
  ]);

  // ส่งกลับเป็น Object ที่มีทั้งข้อมูลและ Metadata
  return {
    links,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
