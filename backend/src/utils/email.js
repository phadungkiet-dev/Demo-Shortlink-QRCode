const nodemailer = require("nodemailer");
const logger = require("./logger");

/**
 * สร้าง Transporter สำหรับส่งเมล
 * อ่านค่าจาก .env เพื่อความยืดหยุ่น (Dev/Prod)
 */
const createTransporter = () => {
  // ตรวจสอบว่ามี Config ครบไหม
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn("⚠️ SMTP configuration is missing. Email will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * @function sendEmail
 * @description ฟังก์ชันส่งอีเมลกลางของระบบ
 * @param {Object} options - { to, subject, text, html }
 */
const sendEmail = async (options) => {
  const transporter = createTransporter();

  if (!transporter) {
    // Fallback สำหรับ Dev กรณีไม่ได้ตั้งค่า SMTP (แสดงใน Console แทน)
    if (process.env.NODE_ENV === "development") {
      logger.info(
        `[DEV-MAIL] To: ${options.to} | Subject: ${options.subject} | Token: (See logs)`
      );
      return;
    }
    throw new Error("Email service is not configured.");
  }

  const mailOptions = {
    from:
      process.env.EMAIL_FROM || '"Shortlink Support" <noreply@shortlink.qr>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`📧 Email sent: ${info.messageId}`);
  } catch (error) {
    logger.error("❌ Error sending email:", error);
    throw new Error("Email could not be sent. Please try again later.");
  }
};

module.exports = sendEmail;
