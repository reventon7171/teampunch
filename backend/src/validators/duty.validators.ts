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

export const setDutyScheduleRuleSchema = z.object({
  employeeId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  taskId: z.string().min(1),
});

export const setDutyAssignmentSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ต้องเป็น YYYY-MM-DD"),
  taskId: z.string().min(1),
});
