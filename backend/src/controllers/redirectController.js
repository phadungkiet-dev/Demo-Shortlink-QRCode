const linkService = require("../services/linkService");
const logger = require("../utils/logger");

const handleRedirect = async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).send("Slug is required.");
    }

    // เก็บข้อมูลผู้เยี่ยมชม (Visitor Data) เพื่อทำ Analytics
    const ip = req.ip;
    const userAgent = req.headers["user-agent"] || "";
    const referrer = req.headers["referer"] || "";

    // เรียก Service เพื่อหาปลายทาง + บันทึกสถิติ
    // (Service จะบันทึก Click แบบ Async ทำให้เราได้ targetUrl กลับมาเร็วมาก)
    const targetUrl = await linkService.getAndRecordClick(
      slug,
      ip,
      userAgent,
      referrer
    );

    // กรณีลิงก์เสีย / หมดอายุ / หรือไม่มีอยู่จริง
    if (!targetUrl) {
      // แทนที่จะส่ง Error Text ธรรมดา เราส่งผู้ใช้กลับไปที่หน้าสวยๆ บน Frontend
      // process.env.CORS_ORIGIN ควรเป็น URL ของ Frontend (เช่น http://localhost:5173)
      const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
      // Redirect 302 (ชั่วคราว) ไปที่หน้า Page Not Found
      return res.redirect(302, `${frontendUrl}/404`);
    }

    // เจอลิงก์ -> พาไปปลายทาง
    // ใช้ 302 Found (Temporary Redirect) เพื่อให้ Browser ไม่ Cache เส้นทาง
    // ทำให้ทุกครั้งที่มีคนกดลิงก์ Request จะวิ่งมาที่ Server เราเสมอ (เพื่อนับสถิติ)
    res.redirect(302, targetUrl);
  } catch (error) {
    logger.error(`Redirect error for slug ${req.params.slug}:`, error);
    next(error);
  }
};

module.exports = {
  handleRedirect,
};
