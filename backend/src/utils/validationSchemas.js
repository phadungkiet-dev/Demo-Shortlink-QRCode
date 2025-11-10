const { z } = require("zod");

// Schema for creating a link
const createLinkSchema = z.object({
  targetUrl: z
    .string()
    .trim()
    .min(1, "Target URL is required.")
    .url("Invalid URL format."),
  // Optional: Allow custom slug
  // slug: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid slug format.').optional(),
});

// Schema for updating a link (e.g., renewing)
const updateLinkSchema = z.object({
  // We only allow renewing for now
  renew: z.boolean().optional(),
  // Can be extended to update targetUrl
  // targetUrl: z.string().trim().url('Invalid URL format.').optional(),
});

// Schema for local login
const loginSchema = z.object({
  email: z.string().email("Invalid email format."),
  password: z.string().min(1, "Password is required."),
});

// Schema for changing password
const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ["confirmPassword"],
  });

module.exports = {
  createLinkSchema,
  updateLinkSchema,
  loginSchema,
  changePasswordSchema,
};
