import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import multer from "multer";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง", details: err.flatten() });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `อัปโหลดไฟล์ไม่สำเร็จ: ${err.message}` });
  }
  console.error(err);
  return res.status(500).json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" });
};
