import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createHolidaySchema = z.object({
  date: z.string().regex(dateRegex, "รูปแบบวันที่ไม่ถูกต้อง"),
  name: z.string().min(1, "กรุณากรอกชื่อวันหยุด"),
});
