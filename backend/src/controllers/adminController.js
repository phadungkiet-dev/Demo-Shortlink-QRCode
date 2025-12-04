const adminService = require("../services/adminService");
const linkService = require("../services/linkService");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { ROUTES } = require("../config/constants");

// -------------------------------------------------------------------
// Get All Users (with Filtering & Pagination)
// -------------------------------------------------------------------
const getAllUsers = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const status = req.query.status || "ALL";

  // Map frontend status to backend logic
  let isBlockedFilter;
  if (status === "ACTIVE") {
    isBlockedFilter = false;
  } else if (status === "BLOCKED") {
    isBlockedFilter = true;
  } else {
    isBlockedFilter = undefined; // ALL
  }

  // Service returns { users, meta, stats }
  const result = await adminService.getAllUsers(
    adminId,
    page,
    limit,
    search,
    isBlockedFilter
  );

  // Format response to match frontend expectation: { data: users, meta: pagination, stats: stats }
  res.json({
    data: result.users,
    meta: result.meta,
    stats: result.stats,
  });
});

// -------------------------------------------------------------------
// Update User Status (Block/Unblock)
// -------------------------------------------------------------------
const updateUserStatus = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const userIdToUpdate = req.params.id;
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
  const userIdToDelete = req.params.id;

  const result = await adminService.deleteUser(userIdToDelete, adminId);
  res.json(result);
});

// -------------------------------------------------------------------
// Change User Role
// -------------------------------------------------------------------
const changeUserRole = catchAsync(async (req, res, next) => {
  const adminId = req.user.id;
  const userIdToUpdate = req.params.id;
  const { role } = req.body;

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
  const userIdToUpdate = req.params.id;
  const { limit } = req.body;

  if (typeof limit !== "number" || limit < 0) {
    throw new AppError("Invalid input. Limit must be a positive number.", 400);
  }

  const updatedUser = await adminService.updateUserLimit(
    userIdToUpdate,
    adminId,
    limit
  );
  res.json(updatedUser);
});

// -------------------------------------------------------------------
// Get User Links (View as Admin)
// -------------------------------------------------------------------
const getUserLinks = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";

  // Reuse logic จาก Link Service
  const result = await linkService.findLinksByOwner(
    userId,
    page,
    limit,
    search
  );

  const linksWithUrl = result.links.map((link) => ({
    ...link,
    shortUrl: `${process.env.BASE_URL}/${ROUTES.SHORT_LINK_PREFIX}/${link.slug}`,
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
