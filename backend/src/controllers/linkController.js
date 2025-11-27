const linkService = require("../services/linkService");
const {
  createLinkSchema,
  updateLinkSchema,
} = require("../utils/validationSchemas");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Create Shortlink (สร้างลิงก์ย่อ)
// -------------------------------------------------------------------
const createLink = async (req, res, next) => {
  try {
    // Validate Input: ตรวจสอบ URL และ Slug ที่ส่งมา
    const { targetUrl, slug } = createLinkSchema.parse(req.body);

    // Self-Redirect Check: ป้องกันไม่ให้สร้างลิงก์ที่ชี้กลับมาหาตัวเอง
    // เช่น ย่อลิงก์ http://mysite.com/r/abc ให้เป็น http://mysite.com/r/xyz (มันจะวนลูป)
    if (targetUrl.includes(process.env.BASE_URL)) {
      return res
        .status(400)
        .json({ message: "Cannot create a shortlink that points to itself." });
    }

    // หา ownerId:
    // ถ้า Login อยู่ -> ใช้ User ID
    // ถ้าไม่ได้ Login -> เป็น null (Anonymous Link)
    const ownerId = req.user ? req.user.id : null;

    // เรียก Service สร้างลิงก์
    if (slug && !ownerId) {
      return res
        .status(403)
        .json({ message: "Custom slugs are for logged-in users only." });
    }

    // เรียก Service สร้างลิงก์
    const link = await linkService.createLink(targetUrl, ownerId, slug);

    // ประกอบร่าง URL เต็มๆ ส่งกลับไปให้ Frontend
    const shortUrl = `${process.env.BASE_URL}/r/${link.slug}`;

    res.status(201).json({ ...link, shortUrl });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------
// Get My Links (ดึงลิงก์ของฉัน)
// -------------------------------------------------------------------
const getMyLinks = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const search = req.query.search || "";
    const ownerId = req.user.id;

    // เรียก Service
    const { links, meta, stats } = await linkService.findLinksByOwner(
      ownerId,
      page,
      limit,
      search
    );

    const linksWithUrl = links.map((link) => ({
      ...link,
      shortUrl: `${process.env.BASE_URL}/r/${link.slug}`,
    }));

    res.json({
      data: linksWithUrl,
      meta: meta,
      stats: stats, // +++ ส่ง stats กลับไป +++
    });
  } catch (error) {
    next(error);
  }
};

// -------------------------------------------------------------------
// Update Link (แก้ไข/ต่ออายุลิงก์)
// -------------------------------------------------------------------
const updateLink = async (req, res, next) => {
  try {
    const linkId = parseInt(req.params.id);
    if (isNaN(linkId)) {
      return res.status(400).json({ message: "Invalid Link ID." });
    }

    const ownerId = req.user.id;
    // Validate ข้อมูลที่จะแก้ไข (เช่น renew: true, qrOptions: {...})
    const updateData = updateLinkSchema.parse(req.body);

    // เรียก Service (Service จะเช็คว่าเป็นเจ้าของลิงก์จริงไหม)
    const updatedLink = await linkService.updateLink(
      linkId,
      ownerId,
      updateData
    );

    res.json({
      ...updatedLink,
      shortUrl: `${process.env.BASE_URL}/r/${updatedLink.slug}`,
    });
  } catch (error) {
    // ดักจับ Error กรณีพยายามแก้ลิงก์คนอื่น หรือหาลิงก์ไม่เจอ
    if (error.message.includes("not found or user does not have permission")) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

// -------------------------------------------------------------------
// Delete Link (ลบลิงก์)
// -------------------------------------------------------------------
const deleteLink = async (req, res, next) => {
  try {
    const linkId = parseInt(req.params.id);
    if (isNaN(linkId)) {
      return res.status(400).json({ message: "Invalid Link ID." });
    }

    const ownerId = req.user.id;

    // เรียก Service เพื่อลบ (Service จะเช็คว่าเป็นเจ้าของลิงก์จริงไหม)
    const result = await linkService.deleteLink(linkId, ownerId);
    res.json(result);
  } catch (error) {
    if (error.message.includes("not found or user does not have permission")) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  createLink,
  getMyLinks,
  updateLink,
  deleteLink,
};
