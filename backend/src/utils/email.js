const nodemailer = require("nodemailer");
const { Resend } = require("resend");
const logger = require("./logger");
const dns = require("node:dns");

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (error) {
  // Ignore error
}

// ใช้ API Key จาก Environment Variable
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * -------------------------------------------------------------------
 * Email Templates (ส่วน Template HTML)
 * -------------------------------------------------------------------
 */
const resetPasswordTemplate = (resetUrl) => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <tr>
        <td style="padding: 30px; text-align: center;">
          
          <h1 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 20px 0;">
            Shortlink<span style="color: #4f46e5;">.QR</span>
          </h1>

          <p style="font-size: 16px; color: #374151; margin-bottom: 25px; line-height: 1.5;">
            You have requested a password reset for your account. Click the button below to proceed.
          </p>

          <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
            <tr>
              <td align="center" style="border-radius: 12px; background-color: #4f46e5; padding: 0;">
                <a href="${resetUrl}" target="_blank" style="font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 12px; border: 1px solid #4f46e5;">
                  Reset My Password
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.5; margin-top: 0;">
            This link will expire in 1 hour. If you did not request this, please ignore this email.
          </p>
          
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 30px 20px; text-align: center;">
          <p style="font-size: 12px; color: #9ca3af;">
            If the button above doesn't work, copy and paste this link:
            <br><a href="${resetUrl}" style="word-break: break-all; color: #4f46e5;">${resetUrl}</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
`;

/**
 * @function createTransporter
 * @description สร้าง Transporter สำหรับส่งเมล อ่านค่าจาก .env
 * @returns {Object|null} Nodemailer Transporter หรือ null ถ้า Config ไม่ครบ
 */
const createTransporter = () => {
  // ตรวจสอบว่ามี Config ครบหรือไม่
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn("⚠️ SMTP configuration is missing.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // เพิ่ม Timeout ป้องกันการรอเก้อ (30 วินาที)
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,

    tls: {
      // ช่วยแก้ปัญหา Certificate ของบาง Server
      rejectUnauthorized: false,
    },
    logger: true,
    debug: true,
  });
};

/**
 * @function sendEmail
 * @description ฟังก์ชันส่งอีเมลกลางของระบบ (รองรับ Mock Mode ใน Dev)
 * @param {Object} options - { to, subject, text, html }
 */
const sendEmail = async (options) => {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    if (!resend) {
      logger.error("❌ [PROD] RESEND_API_KEY is missing!");
      throw new Error("Email service is not configured correctly.");
    }

    try {
      const { data, error } = await resend.emails.send({
        from: "Shortlink.QR <onboarding@resend.dev>",
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        logger.error("❌ [PROD] Resend API Error:", error);
        throw new Error(error.message);
      }

      logger.info(`✅ [PROD] Email sent via Resend. ID: ${data.id}`);
      return;
    } catch (error) {
      logger.error("❌ [PROD] Failed to send email via Resend:", error);
      throw new Error("Failed to send email via Resend Provider.");
    }
  }

  const transporter = createTransporter();

  // กรณีไม่มี Transporter (Config ไม่ครบ หรือตั้งใจไม่ใส่ใน Dev)
  if (!transporter) {
    logger.info("================ [DEV-MAIL MOCK] ================");
    logger.info(`To: ${options.to}`);
    logger.info(`Subject: ${options.subject}`);
    logger.info(`Content: ${options.text}`); // [สำคัญ] ปริ้นเนื้อหาที่มี Link ออกมา
    logger.info("=================================================");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from:
        process.env.EMAIL_FROM || '"Shortlink Support" <noreply@shortlink.qr>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`✅ [DEV] Email sent via Gmail SMTP. ID: ${info.messageId}`);
  } catch (error) {
    logger.error("❌ [DEV] Gmail SMTP Error:", error);
    throw new Error("Failed to send email via Gmail SMTP.");
  }
};

module.exports = {
  sendEmail,
  resetPasswordTemplate,
};
