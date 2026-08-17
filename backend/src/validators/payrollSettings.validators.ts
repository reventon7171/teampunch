import { z } from "zod";

export const updatePayrollSettingsSchema = z.object({
  payFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "SEMI_MONTHLY"]),
  weeklyPayWeekday: z.number().int().min(0).max(6),
  monthlyPayDay: z.number().int().min(1).max(28),
  semiMonthlyPayDay1: z.number().int().min(1).max(28),
  semiMonthlyPayDay2: z.number().int().min(1).max(28),
});
