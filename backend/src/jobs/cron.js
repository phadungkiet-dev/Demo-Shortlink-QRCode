const cron = require("node-cron");
const linkService = require("../services/linkService");
const logger = require("../utils/logger");

const initCronJobs = () => {
  // -------------------------------------------------------------------
  // Cleanup Expired Anonymous Links
  // -------------------------------------------------------------------
  // Cron Syntax:  วินาที(optional) นาที ชั่วโมง วัน เดือน วันในสัปดาห์
  // "0 1 * * *" แปลว่า "รันตอนนาทีที่ 0 ของชั่วโมงที่ 1 ของทุกวัน" (ตี 1 ตรง)
  cron.schedule(
    "0 1 * * *",
    async () => {
      logger.info("🕒 Cron Job Started: Cleaning expired links...");
      try {
        // เรียก Service เพื่อลบลิงก์ที่หมดอายุแล้ว
        const count = await linkService.deleteExpiredAnonymousLinks();
        logger.info(`✅ Cron Job Finished: Deleted ${count} expired links.`);
      } catch (error) {
        // ดักจับ Error ไว้ ไม่ให้ Process หลักพัง
        logger.error("❌ Cron Job Failed:", error);
      }
    },
    // สำคัญ: กำหนด Timezone ให้ตรงกับไทย ไม่งั้นจะรันผิดเวลา (เพราะ Server มักเป็น UTC)
    { timezone: process.env.TZ || "Asia/Bangkok" }
  );

  logger.info("⚙️ Background jobs initialized");
};

module.exports = initCronJobs;
