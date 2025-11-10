const analyticsService = require("../services/analyticsService");

const getLinkStats = async (req, res, next) => {
  try {
    const linkId = parseInt(req.params.id);
    if (isNaN(linkId)) {
      return res.status(400).json({ message: "Invalid Link ID." });
    }

    const ownerId = req.user.id;

    const stats = await analyticsService.getStatsForLink(linkId, ownerId);

    res.json(stats);
  } catch (error) {
    if (error.message.includes("not found or user does not have permission")) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getLinkStats,
};
