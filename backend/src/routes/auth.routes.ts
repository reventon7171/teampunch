import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyPassword } from "../lib/password";
import { signToken } from "../lib/jwt";
import { asyncHandler } from "../lib/asyncHandler";
import { loginSchema } from "../validators/auth.validators";
import { unauthorized } from "../lib/errors";
import { serializeEmployee } from "../lib/serialize";
import { loginRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.post(
  "/admin/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
      throw unauthorized("ชื่อผู้ใช้หรือรหัสผ่านแอดมินไม่ถูกต้อง");
    }
    const token = signToken({ sub: admin.id, role: "admin" });
    res.json({ token, admin: { id: admin.id, username: admin.username } });
  })
);

router.post(
  "/employee/login",
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const employee = await prisma.employee.findUnique({ where: { username } });
    if (!employee || !employee.active || !(await verifyPassword(password, employee.passwordHash))) {
      throw unauthorized("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
    const token = signToken({ sub: employee.id, role: "employee" });
    res.json({ token, employee: serializeEmployee(employee) });
  })
);

export default router;
