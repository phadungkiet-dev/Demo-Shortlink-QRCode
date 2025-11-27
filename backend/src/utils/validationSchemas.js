const { z } = require("zod");

// Schema สำหรับการ "สร้างลิงก์"
const createLinkSchema = z.object({
  targetUrl: z
    .string()
    .trim() // ตัดช่องว่างหน้าหลังออกอัตโนมัติ
    .min(1, "Target URL is required.")
    .url("Invalid URL format."), // บังคับว่าเป็น URL (ต้องมี http/https)
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters.")
    .max(30, "Slug must be at most 30 characters.")
    .regex(
      /^[a-zA-Z0-9_-]+$/, // อนุญาตแค่ตัวอักษร, ตัวเลข, ขีดกลาง, ขีดล่าง
      "Slug can only contain letters, numbers, hyphens, and underscores."
    )
    .optional(), // เป็น Optional เพราะถ้าไม่กรอก เราจะสุ่มให้
});

// Schema สำหรับการ "อัปเดตลิงก์" (เช่น ต่ออายุ)
const updateLinkSchema = z.object({
  renew: z.boolean().optional(), // รับค่า true/false
  targetUrl: z.string().trim().url("Invalid URL format.").optional(),
  qrOptions: z.record(z.any()).optional(), // รับ JSON object อะไรก็ได้ (ยืดหยุ่น)
  disabled: z.boolean().optional(),
});

// Schema สำหรับ "Login"
const loginSchema = z.object({
  email: z.string().email("Invalid email format."), // เช็ครูปแบบอีเมล
  password: z.string().min(1, "Password is required."),
});

// Schema สำหรับ "เปลี่ยนรหัสผ่าน"
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  // .refine คือไม้ตายของ Zod ใช้เช็คเงื่อนไขข้าม field
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ["confirmPassword"], // บอกตำแหน่งที่จะแสดง Error
  });

// Schema สำหรับ "สมัครสมาชิกใหม่" (Register)
const registerSchema = z
  .object({
    email: z.string().email("Invalid email format."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
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
