const { z } = require("zod");

/**
 * Common Rules: กฎที่ใช้ร่วมกันบ่อยๆ
 */
const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters long.");
// .regex(/[A-Z]/, "Password must contain at least one uppercase letter.") // (Optional: ถ้าต้องการเข้มงวด)
// .regex(/[0-9]/, "Password must contain at least one number.");         // (Optional)

/**
 * Schema: สร้างลิงก์ใหม่ (Create Link)
 */
const createLinkSchema = z.object({
  targetUrl: z
    .string()
    .trim()
    .min(1, "Target URL is required.")
    .url("Invalid URL format (must verify http/https)."), // ต้องเป็น URL ที่ถูกต้อง

  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters.")
    .max(30, "Slug must be at most 30 characters.")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Slug can only contain letters, numbers, hyphens (-), and underscores (_)."
    )
    .optional(), // ถ้าไม่ส่งมา ระบบจะ Auto Generate ให้
});

/**
 * Schema: แก้ไขลิงก์ (Update Link)
 */
const updateLinkSchema = z.object({
  renew: z.boolean().optional(),
  targetUrl: z.string().trim().url("Invalid URL format.").optional(),
  qrOptions: z.record(z.any()).optional(), // รับ JSON Object (ยืดหยุ่นสำหรับ Config QR)
  disabled: z.boolean().optional(),
});

/**
 * Schema: เข้าสู่ระบบ (Login)
 */
const loginSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
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
    path: ["confirmPassword"], // ชี้เป้า Error ไปที่ field นี้
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

module.exports = {
  createLinkSchema,
  updateLinkSchema,
  loginSchema,
  changePasswordSchema,
  registerSchema,
};
