import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createDayOffSwapSchema = z
  .object({
    originalOffDate: z.string().regex(dateRegex, "รูปแบบวันที่ไม่ถูกต้อง"),
    swappedToDate: z.string().regex(dateRegex, "รูปแบบวันที่ไม่ถูกต้อง"),
    reason: z.string().optional(),
  })
  .refine((v) => v.originalOffDate !== v.swappedToDate, {
    message: "วันหยุดเดิมและวันที่ขอสลับต้องไม่ใช่วันเดียวกัน",
    path: ["swappedToDate"],
  });

export const dayOffSwapStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const dayOffSwapQuerySchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
});
