import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createOvertimeSchema = z.object({
  date: z.string().regex(dateRegex, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)"),
  startTime: z.string().regex(timeRegex, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
  endTime: z.string().regex(timeRegex, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
  reason: z.string().optional(),
});

export const overtimeStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  // only meaningful when status=APPROVED — the admin's own baht figure for this specific
  // request, overriding the hours x hourlyRate x otRateMultiplier formula. Omitted/null =
  // use the formula.
  approvedAmount: z.number().min(0).nullable().optional(),
});

export const overtimeQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
