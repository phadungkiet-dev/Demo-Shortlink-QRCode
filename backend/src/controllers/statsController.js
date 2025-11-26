const analyticsService = require("../services/analyticsService");

// -------------------------------------------------------------------
// Get Link Stats (ดึงสถิติของลิงก์)
// -------------------------------------------------------------------
const getLinkStats = async (req, res, next) => {
  try {
    // แปลง ID จาก URL param ให้เป็นตัวเลข (Integer)
    const linkId = parseInt(req.params.id);

    // ถ้าไม่ใช่ตัวเลข -> ส่ง 400 Bad Request
    if (isNaN(linkId)) {
      return res.status(400).json({ message: "Invalid Link ID." });
    }

    // ดึง ID ของ User คนปัจจุบัน (จาก Session)
    const ownerId = req.user.id;

    // เรียก Service เพื่อดึงข้อมูลสถิติ
    // (ส่ง ownerId ไปด้วย เพื่อให้ Service เช็คว่า "เป็นเจ้าของลิงก์นี้จริงไหม")
    const stats = await analyticsService.getStatsForLink(linkId, ownerId);

    // ส่งข้อมูลกลับไป
    res.json(stats);
  } catch (error) {
    // จัดการ Error กรณี "หาลิงก์ไม่เจอ" หรือ "ไม่ใช่เจ้าของ"
    if (error.message.includes("not found or user does not have permission")) {
      return res.status(404).json({ message: error.message });
    }

    // Error อื่นๆ (เช่น DB พัง) ส่งต่อให้ Global Handler
    next(error);
  }
};

module.exports = {
  getLinkStats,
};
