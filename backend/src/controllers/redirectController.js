const linkService = require("../services/linkService");
const logger = require("../utils/logger");

const handleRedirect = async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).send("Slug is required.");
    }

    const ip = req.ip;
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || "";

    const targetUrl = await linkService.getAndRecordClick(
      slug,
      ip,
      userAgent,
      referrer
    );

    if (!targetUrl) {
      // TODO: Redirect to a frontend "Not Found" page
      return res.status(404).send("Link not found, expired, or disabled.");
    }

    // 302 Found (Temporary Redirect)
    res.redirect(302, targetUrl);
  } catch (error) {
    logger.error(`Redirect error for slug ${req.params.slug}:`, error);
    next(error);
  }
};

module.exports = {
  handleRedirect,
};
