const { z } = require("zod");
const { VALIDATION } = require("../config/constants");

// -------------------------------------------------------------------
// Reusable Rules (กฎที่ใช้ซ้ำได้)
// -------------------------------------------------------------------
// Password Strength: 1 upper, 1 lower, 1 number, 1 special char, min length
const passwordRule = z
  .string()
  .min(
    VALIDATION.PASSWORD_MIN_LEN,
    `Password must be at least ${VALIDATION.PASSWORD_MIN_LEN} characters long.`
  )
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(
    /[\W_]/,
    "Password must contain at least one special character (!@#$...)."
  );

// -------------------------------------------------------------------
// Schemas (แม่แบบตรวจสอบข้อมูล)
// -------------------------------------------------------------------
/**
 * Schema: สร้างลิงก์ใหม่ (Create Link)
 */
const createLinkSchema = z.object({
  targetUrl: z
    .string()
    .trim()
    .min(1, "Target URL is required.")
    .url("Invalid URL format (must include http:// or https://)"), // ต้องเป็น URL ที่ถูกต้อง

  slug: z
    .string()
    .trim()
    .min(
      VALIDATION.SLUG_MIN_LEN,
      `Slug must be at least ${VALIDATION.SLUG_MIN_LEN} characters.`
    )
    .max(
      VALIDATION.SLUG_MAX_LEN,
      `Slug must be at most ${VALIDATION.SLUG_MAX_LEN} characters.`
    )
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Slug can only contain letters, numbers, hyphens (-), and underscores (_)."
    )
    .optional(), // Optional: ถ้าไม่ส่งมา ระบบจะ Auto Generate ให้
});

/**
 * Schema: แก้ไขลิงก์ (Update Link)
 */
const updateLinkSchema = z.object({
  renew: z.boolean().optional(),
  targetUrl: z.string().trim().url("Invalid URL format.").optional(),
  qrOptions: z.record(z.any()).optional(), // รับ JSON Config ของ QR Code
  disabled: z.boolean().optional(),
});

/**
 * Schema: เข้าสู่ระบบ (Login)
 */
const loginSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional(),
});

/**
 * Schema: เปลี่ยนรหัสผ่าน (Change Password)
 */
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required."),
    newPassword: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * Schema: ลงทะเบียน (Register)
 */
const registerSchema = z
  .object({
    email: z.string().email("Invalid email format."),
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * Schema: รีเซ็ตรหัสผ่านใหม่ (Reset Password)
 */
const resetPasswordSchema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

module.exports = {
  createLinkSchema,
  updateLinkSchema,
  loginSchema,
  changePasswordSchema,
  registerSchema,
  resetPasswordSchema,
};
