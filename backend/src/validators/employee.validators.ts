import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createEmployeeSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ"),
  position: z.string().optional(),
  baseSalary: z.coerce.number().positive("เงินเดือนฐานต้องมากกว่า 0"),
  workStart: z.string().regex(timeRegex, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
  workEnd: z.string().regex(timeRegex, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
  daysOff: z.array(z.number().int().min(0).max(6)).default([]),
  hireDate: z.string().regex(dateRegex, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
  socialSecurityRate: z.coerce.number().min(0).max(100).default(0),
  wageType: z.enum(["MONTHLY", "DAILY_WAGE"]).default("MONTHLY"),
  username: z
    .string()
    .min(3, "Username ต้องมีอย่างน้อย 3 ตัวอักษร")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Username ใช้ได้เฉพาะตัวอักษร ตัวเลข . _ -"),
  password: z.string().min(4, "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z.string().min(4).optional(),
    active: z.boolean().optional(),
  });
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
