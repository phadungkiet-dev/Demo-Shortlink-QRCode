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
      // --- (ลบของเดิม) ---
      // return res.status(404).send("Link not found, expired, or disabled.");

      // +++ (ของใหม่: ยืดหยุ่นกว่า) +++
      // Redirect ไปที่หน้า 404 ของ Frontend แทน
      // process.env.CORS_ORIGIN คือ URL ของหน้าบ้าน (เช่น http://localhost:5173)
      // เราต้องแน่ใจว่าใน .env ตั้งค่า CORS_ORIGIN ไว้ถูกต้องแล้ว
      const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
      return res.redirect(302, `${frontendUrl}/404`);
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
