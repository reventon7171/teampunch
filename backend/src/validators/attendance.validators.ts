import { z } from "zod";

export const punchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const attendanceQuerySchema = z.object({
  employeeId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const correctAttendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
  present: z.boolean(),
});
