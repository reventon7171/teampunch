export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export const notFound = (what: string) => new AppError(404, `ไม่พบ${what}`);
export const forbidden = (message = "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้") => new AppError(403, message);
export const badRequest = (message: string) => new AppError(400, message);
export const unauthorized = (message = "กรุณาเข้าสู่ระบบ") => new AppError(401, message);
export const conflict = (message: string) => new AppError(409, message);
