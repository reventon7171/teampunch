import { z } from "zod";

export const updatePayrollSettingsSchema = z.object({
  payFrequency: z.enum(["WEEKLY", "MONTHLY", "SEMI_MONTHLY"]),
  weeklyPayWeekday: z.number().int().min(0).max(6),
  monthlyPayDay: z.number().int().min(1).max(28),
  semiMonthlyPayDay1: z.number().int().min(1).max(28),
  semiMonthlyPayDay2: z.number().int().min(1).max(28),
  // null = keep deriving the late deduction from each employee's hourly rate (the original
  // behavior). A number switches the whole org to a flat baht amount instead.
  lateDeductionFirstHour: z.number().min(0).nullable().optional(),
  lateDeductionPerExtraHour: z.number().min(0).nullable().optional(),
  dailyWageDeductAbsence: z.boolean().optional(),
  dailyWageAbsenceDeductionAmount: z.number().min(0).nullable().optional(),
});
