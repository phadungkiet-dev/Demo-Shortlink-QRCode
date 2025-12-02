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
  // Validate Input (ถ้าไม่ผ่าน Zod จะ throw error ไปที่ Global Handler เอง)
  const { targetUrl, slug } = createLinkSchema.parse(req.body);

  // Business Logic Validation
  // ป้องกันการย่อลิงก์ของตัวเอง (Self-loop)
  if (targetUrl.includes(process.env.BASE_URL)) {
    throw new AppError("Cannot create a shortlink that points to itself.", 400);
  }

  const ownerId = req.user ? req.user.id : null;

  // ป้องกัน Anonymous พยายามส่ง Slug มาเอง (ต้อง Login ก่อน)
  if (slug && !ownerId) {
    throw new AppError(
      "Custom slugs are for logged-in users only. Please login.",
      403
    );
  }

  // Call Service
  const link = await linkService.createLink(targetUrl, ownerId, slug);

  // Send Response
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

  // Validate ข้อมูลที่จะแก้ไข (อนุญาตเฉพาะบาง field ที่กำหนดใน Schema)
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
