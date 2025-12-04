const analyticsService = require("../services/analyticsService");
const catchAsync = require("../utils/catchAsync");

const getLinkStats = catchAsync(async (req, res, next) => {
  const linkId = req.params.id;
  const ownerId = req.user.id;

  // รับ Timezone จาก Frontend (ถ้าไม่ส่งมา ให้ใช้ค่า Default ของ Server หรือ 'Asia/Bangkok')
  // ตัวอย่างค่าที่ส่งมา: 'Asia/Tokyo', 'America/New_York', 'UTC'
  const timezone = req.query.timezone || process.env.TZ || "Asia/Bangkok";

  const stats = await analyticsService.getStatsForLink(
    linkId,
    ownerId,
    timezone
  );
  res.json(stats);
});

module.exports = {
  getLinkStats,
};
