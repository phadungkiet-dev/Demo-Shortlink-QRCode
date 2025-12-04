const nodemailer = require("nodemailer");
const logger = require("./logger");

/**
 * -------------------------------------------------------------------
 * Email Templates (ส่วน Template HTML)
 * -------------------------------------------------------------------
 */
const resetPasswordTemplate = (resetUrl) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Shortlink.QR</h1>
    </div>
    <div style="padding: 40px 20px; text-align: center;">
      <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset Request</h2>
      <p style="color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
        You (or someone else) have requested to reset your password. <br>
        Click the button below to complete the process.
      </p>
      <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
      <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
        This link allows you to reset your password within 1 hour. <br>
        If you didn't ask for this, please ignore this email.
      </p>
    </div>
    <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Shortlink.QR Service</p>
    </div>
  </div>
`;

/**
 * @function createTransporter
 * @description สร้าง Transporter สำหรับส่งเมล อ่านค่าจาก .env
 * @returns {Object|null} Nodemailer Transporter หรือ null ถ้า Config ไม่ครบ
 */
const createTransporter = () => {
  // ตรวจสอบว่ามี Config ครบหรือไม่
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn(
      "⚠️ SMTP configuration is missing. Email will not be sent (Mock Mode)."
    );
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"), // แปลงเป็น Int เสมอ
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * @function sendEmail
 * @description ฟังก์ชันส่งอีเมลกลางของระบบ (รองรับ Mock Mode ใน Dev)
 * @param {Object} options - { to, subject, text, html }
 */
const sendEmail = async (options) => {
  const transporter = createTransporter();

  // กรณีไม่มี Transporter (Config ไม่ครบ หรือตั้งใจไม่ใส่ใน Dev)
  if (!transporter) {
    // ถ้าเป็น Dev Mode ให้ Mock การส่งและปริ้น Link ออกมาให้กดได้เลย
    if (process.env.NODE_ENV === "development") {
      logger.info("================ [DEV-MAIL MOCK] ================");
      logger.info(`To: ${options.to}`);
      logger.info(`Subject: ${options.subject}`);
      logger.info(`Content: ${options.text}`); // [สำคัญ] ปริ้นเนื้อหาที่มี Link ออกมา
      logger.info("=================================================");
      return;
    }
    // ถ้าเป็น Production ต้อง Error เท่านั้น
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
    logger.info(`📧 Email sent successfully: ${info.messageId}`);
  } catch (error) {
    logger.error("❌ Error sending email:", error);
    throw new Error("Email could not be sent. Please try again later.");
  }
};

module.exports = {
  sendEmail,
  resetPasswordTemplate,
};
