const linkService = require("../services/linkService");
const catchAsync = require("../utils/catchAsync");
const logger = require("../utils/logger");

// -------------------------------------------------------------------
// Handle Redirect
// -------------------------------------------------------------------
const handleRedirect = catchAsync(async (req, res, next) => {
  const { slug } = req.params;
  if (!slug) {
    // ส่งเป็น Text ธรรมดาเพราะไม่ใช่ API JSON response
    return res.status(400).send("Slug is required.");
  }

  const ip = req.ip;
  const userAgent = req.headers["user-agent"] || "Unknown";
  const referrer = req.headers["referer"] || "Direct";

  const targetUrl = await linkService.getAndRecordClick(
    slug,
    ip,
    userAgent,
    referrer
  );

  if (!targetUrl) {
    // Redirect ไปหน้า 404 ของ Frontend (UX ที่ดีกว่าส่ง JSON error)
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.CORS_ORIGIN ||
      "http://localhost:5173";
    return res.redirect(302, `${frontendUrl}/404`);
  }

  res.redirect(302, targetUrl);
});

module.exports = {
  handleRedirect,
};
