const analyticsService = require("../services/analyticsService");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const getLinkStats = catchAsync(async (req, res, next) => {
  const linkId = parseInt(req.params.id);
  if (isNaN(linkId)) {
    throw new AppError("Invalid Link ID.", 400);
  }

  const ownerId = req.user.id;

  const stats = await analyticsService.getStatsForLink(linkId, ownerId);
  res.json(stats);
});

module.exports = {
  getLinkStats,
};
