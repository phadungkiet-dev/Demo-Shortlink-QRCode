const { google } = require("googleapis");
const MailComposer = require("nodemailer/lib/mail-composer");
const logger = require("./logger");

/**
 * -------------------------------------------------------------------
 * Constants & Configuration
 * -------------------------------------------------------------------
 */

const OAUTH_PLAYGROUND = "https://developers.google.com/oauthplayground";

/**
 * ดึงค่า Config จาก Environment Variables พร้อม Validation
 * @returns {Object|null} คืนค่า Object config หรือ null ถ้าค่าไม่ครบ
 */
const getOAuthConfig = () => {
  const { OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REFRESH_TOKEN } =
    process.env;

  if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REFRESH_TOKEN) {
    return null;
  }

  return {
    clientId: OAUTH_CLIENT_ID,
    clientSecret: OAUTH_CLIENT_SECRET,
    refreshToken: OAUTH_REFRESH_TOKEN,
  };
};

/**
 * -------------------------------------------------------------------
 * Private Helpers
 * -------------------------------------------------------------------
 */

/**
 * สร้าง Gmail API Client โดยใช้ OAuth2
 * @returns {Object|null} Google Gmail Service Instance
 */
const _createGmailClient = () => {
  const config = getOAuthConfig();
  if (!config) return null;

  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    OAUTH_PLAYGROUND
  );

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
};

/**
 * สร้าง Raw Email String (Base64Encoded) ตามมาตรฐาน RFC 2822
 * @param {string} to - อีเมลผู้รับ
 * @param {string} subject - หัวข้ออีเมล
 * @param {string} htmlBody - เนื้อหา HTML
 * @returns {Promise<string>} Base64URL string สำหรับ Gmail API
 */
const _createRawMessage = async (to, subject, htmlBody) => {
  const mail = new MailComposer({
    to,
    subject,
    html: htmlBody,
    text: "This email requires HTML support to view properly.",
  });

  const message = await mail.compile().build();

  // Convert Buffer to Base64URL (RFC 4648)
  return message
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * -------------------------------------------------------------------
 * Public Functions
 * -------------------------------------------------------------------
 */

/**
 * ส่งอีเมลผ่าน Gmail API (HTTP/REST)
 * ฟังก์ชันนี้ออกแบบมาให้ทะลุข้อจำกัด Port SMTP ของ Cloud Hosting (Render)
 * * @param {Object} options
 * @param {string} options.to - อีเมลปลายทาง
 * @param {string} options.subject - หัวข้ออีเมล
 * @param {string} options.html - เนื้อหาอีเมล (HTML)
 * @param {string} [options.text] - เนื้อหา Plain text (Optional)
 */

const sendEmail = async (options) => {
  // ตรวจสอบ Config และสร้าง Client
  const gmail = _createGmailClient();

  // Handle กรณี Config ไม่ครบ (Mock Mode)
  if (!gmail) {
    _logMockEmail(options);

    // Enforce Error ใน Production
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Critical: OAuth configuration is missing in Production environment."
      );
    }
    return;
  }

  try {
    // Prepare Message (MIME)
    const rawMessage = await _createRawMessage(
      options.to,
      options.subject,
      options.html
    );

    // Execute API Call
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    logger.info(`✅ Email sent successfully via Gmail API. ID: ${res.data.id}`);
  } catch (error) {
    _handleEmailError(error);
  }
};

/**
 * Helper สำหรับ Log กรณี Mock (แยกออกมาเพื่อความสะอาดของ Main Logic)
 */
const _logMockEmail = (options) => {
  logger.info(
    "\n📧 ================ [MOCK MAIL (Config Missing)] ================"
  );
  logger.info(`To:      ${options.to}`);
  logger.info(`Subject: ${options.subject}`);
  logger.info(
    "===============================================================\n"
  );
};

/**
 * Centralized Error Handler
 */
const _handleEmailError = (error) => {
  logger.error("❌ Failed to send email via Gmail API");

  if (error.response) {
    // API Error (เช่น 401, 403 จาก Google)
    logger.error(
      `Status: ${error.response.status} - ${error.response.statusText}`
    );
    logger.error(`Details: ${JSON.stringify(error.response.data, null, 2)}`);

    if (error.response.status === 401) {
      logger.error("👉 Tip: Check if Refresh Token is expired or revoked.");
    }
  } else {
    // Network or Logic Error
    logger.error(`Error Message: ${error.message}`);
  }

  throw new Error("Email Service Error: Unable to send email via Gmail API.");
};

/**
 * -------------------------------------------------------------------
 * Templates (แยกไว้ด้านล่าง หรือควรย้ายไปไฟล์ template แยกต่างหาก)
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

module.exports = {
  sendEmail,
  resetPasswordTemplate,
};
