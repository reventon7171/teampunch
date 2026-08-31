import { z } from "zod";

export const updatePayrollSettingsSchema = z.object({
  payFrequency: z.enum(["WEEKLY", "MONTHLY", "SEMI_MONTHLY"]),
  weeklyPayWeekday: z.number().int().min(0).max(6),
  // 31 (and any value past a given month's length) clamps to that month's actual last day —
  // see clampDay in lib/payroll.ts — so 31 doubles as "the last day of the month" year-round.
  monthlyPayDay: z.number().int().min(1).max(31),
  semiMonthlyPayDay1: z.number().int().min(1).max(31),
  semiMonthlyPayDay2: z.number().int().min(1).max(31),
  // null = keep deriving the late deduction from each employee's hourly rate (the original
  // behavior). A number switches the whole org to a flat baht amount instead.
  lateDeductionFirstHour: z.number().min(0).nullable().optional(),
  lateDeductionPerExtraHour: z.number().min(0).nullable().optional(),
  dailyWageDeductAbsence: z.boolean().optional(),
  dailyWageAbsenceDeductionAmount: z.number().min(0).nullable().optional(),
  otRateMultiplier: z.number().min(1, "อัตรา OT ต้องไม่น้อยกว่า 1 เท่า").optional(),
});
