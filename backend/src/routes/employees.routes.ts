import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole, requireSelfOrAdmin } from "../middleware/auth";
import { createEmployeeSchema, updateEmployeeSchema } from "../validators/employee.validators";
import { serializeEmployee } from "../lib/serialize";
import { hashPassword } from "../lib/password";
import { badRequest, conflict, notFound } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const employees = await prisma.employee.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    res.json(employees.map(serializeEmployee));
  })
);

router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = createEmployeeSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const existing = await prisma.employee.findUnique({
      where: { organizationId_username: { organizationId, username: input.username } },
    });
    if (existing) throw conflict("มี Username นี้อยู่แล้ว กรุณาใช้ชื่ออื่น");

    const passwordHash = await hashPassword(input.password);
    const employee = await prisma.employee.create({
      data: {
        organizationId,
        name: input.name,
        position: input.position,
        baseSalary: input.baseSalary,
        workStart: input.workStart,
        workEnd: input.workEnd,
        daysOff: input.daysOff,
        hireDate: input.hireDate,
        dutyRotationEnabled: input.dutyRotationEnabled,
        username: input.username,
        passwordHash,
      },
    });
    res.status(201).json(serializeEmployee(employee));
  })
);

router.get(
  "/:id",
  requireSelfOrAdmin("id"),
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!employee) throw notFound("พนักงาน");
    res.json(serializeEmployee(employee));
  })
);

router.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = updateEmployeeSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const employee = await prisma.employee.findFirst({ where: { id: req.params.id, organizationId } });
    if (!employee) throw notFound("พนักงาน");

    if (input.username && input.username !== employee.username) {
      const existing = await prisma.employee.findUnique({
        where: { organizationId_username: { organizationId, username: input.username } },
      });
      if (existing) throw conflict("มี Username นี้อยู่แล้ว กรุณาใช้ชื่ออื่น");
    }

    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        name: input.name,
        position: input.position,
        baseSalary: input.baseSalary,
        workStart: input.workStart,
        workEnd: input.workEnd,
        daysOff: input.daysOff,
        hireDate: input.hireDate,
        dutyRotationEnabled: input.dutyRotationEnabled,
        username: input.username,
        active: input.active,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
    res.json(serializeEmployee(updated));
  })
);

// Permanent delete is only allowed once an employee is already deactivated — this forces the
// two-step deactivate-then-delete flow server-side too, not just in the mobile UI, so a stray
// API call (or a future UI bug) can't wipe an active employee's payroll history in one tap.
router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!employee) throw notFound("พนักงาน");
    if (employee.active) {
      throw badRequest("กรุณาปิดใช้งานพนักงานก่อน จึงจะลบถาวรได้ (ป้องกันการลบโดยไม่ตั้งใจ)");
    }
    await prisma.employee.delete({ where: { id: employee.id } });
    res.status(204).send();
  })
);

export default router;
