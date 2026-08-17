import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const upsertShiftSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อกะ").max(50),
  startTime: z.string().regex(timeRegex, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
  endTime: z.string().regex(timeRegex, "รูปแบบเวลาไม่ถูกต้อง (HH:MM)"),
});
export type UpsertShiftInput = z.infer<typeof upsertShiftSchema>;

export const selectShiftSchema = z.object({
  shiftId: z.string().uuid("รหัสกะไม่ถูกต้อง"),
});
