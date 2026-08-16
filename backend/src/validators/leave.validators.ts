import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createLeaveSchema = z.object({
  date: z.string().regex(dateRegex, "รูปแบบวันที่ไม่ถูกต้อง"),
  type: z.enum(["SICK", "PERSONAL", "VACATION"]),
  reason: z.string().optional(),
});

export const leaveStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const leaveQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
