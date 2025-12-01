const adminService = require("../services/adminService");
const linkService = require("../services/linkService");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// -------------------------------------------------------------------
// Get All Users
// -------------------------------------------------------------------
const getAllUsers = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  const result = await adminService.getAllUsers(adminId, page, limit, search);
  res.json(result);
});

// -------------------------------------------------------------------
// Update User Status
// -------------------------------------------------------------------
const updateUserStatus = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const userIdToUpdate = parseInt(req.params.id);

  if (isNaN(userIdToUpdate)) {
    throw new AppError("Invalid User ID.", 400);
  }

  const { isBlocked } = req.body;
  if (typeof isBlocked !== "boolean") {
    throw new AppError(
      "Invalid request body. 'isBlocked' (boolean) is required.",
      400
    );
  }

  // Service จะจัดการ Logic ห้ามแบน Admin ด้วยกันให้เอง
  const updatedUser = await adminService.updateUserStatus(
    userIdToUpdate,
    adminId,
    isBlocked
  );

  res.json(updatedUser);
});

// -------------------------------------------------------------------
// Delete User
// -------------------------------------------------------------------
const deleteUser = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const userIdToDelete = parseInt(req.params.id);

  if (isNaN(userIdToDelete)) {
    throw new AppError("Invalid User ID.", 400);
  }

  const result = await adminService.deleteUser(userIdToDelete, adminId);
  res.json(result);
});

// -------------------------------------------------------------------
// Change User Role
// -------------------------------------------------------------------
const changeUserRole = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const userIdToUpdate = parseInt(req.params.id);
  const { role } = req.body;

  if (isNaN(userIdToUpdate)) {
    throw new AppError("Invalid User ID.", 400);
  }

  const updatedUser = await adminService.changeUserRole(
    userIdToUpdate,
    adminId,
    role
  );
  res.json(updatedUser);
});

// -------------------------------------------------------------------
// Update User Limit
// -------------------------------------------------------------------
const updateUserLimit = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const userIdToUpdate = parseInt(req.params.id);
  const { limit } = req.body;

  if (isNaN(userIdToUpdate) || typeof limit !== "number") {
    throw new AppError("Invalid input. Limit must be a number.", 400);
  }

  const updatedUser = await adminService.updateUserLimit(
    userIdToUpdate,
    adminId,
    limit
  );
  res.json(updatedUser);
});

// -------------------------------------------------------------------
// Get User Links (Admin View)
// -------------------------------------------------------------------
const getUserLinks = catchAsync(async (req, res, next) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    throw new AppError("Invalid User ID", 400);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  // Reuse Service ของ Link ได้เลย
  const result = await linkService.findLinksByOwner(
    userId,
    page,
    limit,
    search
  );

  const linksWithUrl = result.links.map((link) => ({
    ...link,
    shortUrl: `${process.env.BASE_URL}/r/${link.slug}`,
  }));

  res.json({
    data: linksWithUrl,
    meta: result.meta,
    stats: result.stats,
  });
});

module.exports = {
  getAllUsers,
  getUserLinks,
  updateUserStatus,
  deleteUser,
  changeUserRole,
  updateUserLimit,
};
