import { z } from "zod";

const periodKeyRegex = /^\d{4}-\d{2}-H[12]$/;
const yearMonthRegex = /^\d{4}-\d{2}$/;

export const periodQuerySchema = z.object({
  period: z.string().regex(periodKeyRegex, "รูปแบบงวดไม่ถูกต้อง (YYYY-MM-H1|H2)").optional(),
});

export const setAdvanceSchema = z.object({
  employeeId: z.string().min(1),
  periodKey: z.string().regex(periodKeyRegex, "รูปแบบงวดไม่ถูกต้อง (YYYY-MM-H1|H2)"),
  amount: z.coerce.number().min(0),
  note: z.string().optional(),
});

export const setCommissionSchema = z.object({
  employeeId: z.string().min(1),
  yearMonth: z.string().regex(yearMonthRegex, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)"),
  amount: z.coerce.number().min(0),
});
