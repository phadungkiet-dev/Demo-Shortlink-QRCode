const cron = require("node-cron");
const linkService = require("../services/linkService");
const logger = require("../utils/logger");

const initCronJobs = () => {
  // ลบลิงก์ Anonymous ที่หมดอายุ (รันทุกตี 1)
  cron.schedule(
    "0 1 * * *",
    async () => {
      logger.info("🕒 Cron Job Started: Cleaning expired links...");
      try {
        const count = await linkService.deleteExpiredAnonymousLinks();
        logger.info(`✅ Cron Job Finished: Deleted ${count} expired links.`);
      } catch (error) {
        logger.error("❌ Cron Job Failed:", error);
      }
    },
    { timezone: process.env.TZ || "Asia/Bangkok" }
  );
  
  logger.info("⚙️  Background jobs initialized");
};

module.exports = initCronJobs;