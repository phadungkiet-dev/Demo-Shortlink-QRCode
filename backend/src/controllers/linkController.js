const linkService = require("../services/linkService");
const {
  createLinkSchema,
  updateLinkSchema,
} = require("../utils/validationSchemas");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { ROUTES } = require("../config/constants");

// -------------------------------------------------------------------
// Create Shortlink
// -------------------------------------------------------------------
const createLink = catchAsync(async (req, res, next) => {
  // Validate Input
  const { targetUrl, slug } = createLinkSchema.parse(req.body);

  // ป้องกันการสร้างลิงก์ที่ชี้กลับมาหาตัวเอง โดยเช็คที่ Hostname
  try {
    const targetObj = new URL(targetUrl);
    const baseObj = new URL(process.env.BASE_URL); // เช่น http://localhost:3001

    if (targetObj.hostname === baseObj.hostname) {
      throw new AppError(
        "Cannot create a shortlink that points to itself.",
        400
      );
    }
  } catch (error) {
    // ถ้าเป็น AppError ให้โยนต่อ (กรณี Loop)
    if (error instanceof AppError) throw error;
    // ถ้าเป็น Error จากการ Parse URL (ไม่น่าเกิดเพราะ Zod กรองแล้ว) ก็ปล่อยผ่านไปก่อน
  }

  const ownerId = req.user ? req.user.id : null;

  // Rule: Custom slugs are for members only
  if (slug && !ownerId) {
    throw new AppError(
      "Custom slugs are for logged-in users only. Please login.",
      403
    );
  }

  // Call Service
  const link = await linkService.createLink(targetUrl, ownerId, slug);

  // Send Response (Construct full URL for frontend convenience)
  res.status(201).json({
    ...link,
    shortUrl: `${process.env.BASE_URL}/${ROUTES.SHORT_LINK_PREFIX}/${link.slug}`,
  });
});

// -------------------------------------------------------------------
// Get My Links
// -------------------------------------------------------------------
const getMyLinks = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 9;
  const search = req.query.search || "";
  const status = req.query.status || "ALL";
  const ownerId = req.user.id;

  const { links, meta, stats } = await linkService.findLinksByOwner(
    ownerId,
    page,
    limit,
    search,
    status
  );

  // Map URL เต็มให้ Frontend ใช้งานง่าย
  const linksWithUrl = links.map((link) => ({
    ...link,
    shortUrl: `${process.env.BASE_URL}/${ROUTES.SHORT_LINK_PREFIX}/${link.slug}`,
  }));

  res.json({
    data: linksWithUrl,
    meta,
    stats,
  });
});

// -------------------------------------------------------------------
// Update Link
// -------------------------------------------------------------------
const updateLink = catchAsync(async (req, res, next) => {
  const linkId = req.params.id;

  const ownerId = req.user.id;

  // Validate ข้อมูลที่จะแก้ไข
  const updateData = updateLinkSchema.parse(req.body);

  // Service จะ throw AppError(404/403) ให้เองถ้าไม่ใช่เจ้าของ
  const updatedLink = await linkService.updateLink(linkId, ownerId, updateData);

  res.json({
    ...updatedLink,
    shortUrl: `${process.env.BASE_URL}/${ROUTES.SHORT_LINK_PREFIX}/${updatedLink.slug}`,
  });
});

// -------------------------------------------------------------------
// Delete Link
// -------------------------------------------------------------------
const deleteLink = catchAsync(async (req, res, next) => {
  const linkId = req.params.id;
  const ownerId = req.user.id;

  const result = await linkService.deleteLink(linkId, ownerId);
  res.json(result);
});

module.exports = {
  createLink,
  getMyLinks,
  updateLink,
  deleteLink,
};
