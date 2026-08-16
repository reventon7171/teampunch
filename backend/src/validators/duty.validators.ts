import { z } from "zod";

export const dutyQuerySchema = z.object({
  employeeId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const createDutyTaskOptionSchema = z.object({
  label: z.string().min(1, "กรุณากรอกชื่อหน้าที่"),
});

export const updateDutyTaskOptionSchema = z.object({
  active: z.boolean(),
});
