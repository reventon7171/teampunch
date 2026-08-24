import { z } from "zod";

// A periodKey takes one of three shapes depending on the org's PayFrequency (see
// periodKeyFromDate in lib/payroll.ts): YYYY-MM-DD (WEEKLY, the period's end date),
// YYYY-MM (MONTHLY), or YYYY-MM-A|B (SEMI_MONTHLY, the two half-month periods).
const periodKeyRegex = /^\d{4}-\d{2}(-\d{2}|-[AB])?$/;
const yearMonthRegex = /^\d{4}-\d{2}$/;

export const periodQuerySchema = z.object({
  period: z.string().regex(periodKeyRegex, "รูปแบบงวดไม่ถูกต้อง").optional(),
});

export const setAdvanceSchema = z.object({
  employeeId: z.string().min(1),
  periodKey: z.string().regex(periodKeyRegex, "รูปแบบงวดไม่ถูกต้อง"),
  amount: z.coerce.number().min(0),
  note: z.string().optional(),
});

export const setCommissionSchema = z.object({
  employeeId: z.string().min(1),
  yearMonth: z.string().regex(yearMonthRegex, "รูปแบบเดือนไม่ถูกต้อง (YYYY-MM)"),
  amount: z.coerce.number().min(0),
});
