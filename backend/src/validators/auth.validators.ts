import { z } from "zod";

// slug is the short company code a business picks at signup (e.g. "somchai-cafe") and
// everyone in that org types at login, since usernames are only unique within an org.
const slugSchema = z
  .string()
  .min(2, "รหัสร้าน/บริษัทต้องมีอย่างน้อย 2 ตัวอักษร")
  .max(40)
  .regex(/^[a-z0-9-]+$/, "รหัสร้าน/บริษัทใช้ได้เฉพาะตัวอักษรอังกฤษพิมพ์เล็ก ตัวเลข และขีด (-)");

export const loginSchema = z.object({
  slug: slugSchema,
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerOrgSchema = z.object({
  organizationName: z.string().min(2, "กรุณากรอกชื่อร้าน/บริษัท").max(100),
  slug: slugSchema.optional(),
  adminUsername: z.string().min(2, "Username ต้องมีอย่างน้อย 2 ตัวอักษร").max(50),
  adminPassword: z.string().min(4, "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"),
});
export type RegisterOrgInput = z.infer<typeof registerOrgSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "กรุณากรอกรหัสผ่านเดิม"),
  newPassword: z.string().min(4, "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"),
});

export const setAdminEmailSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
});

export const forgotPasswordSchema = z.object({
  slug: slugSchema,
  username: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  slug: slugSchema,
  username: z.string().min(1),
  code: z.string().length(6, "รหัสยืนยันต้องมี 6 หลัก"),
  newPassword: z.string().min(4, "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"),
});
