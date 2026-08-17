import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole, requireSelfOrAdmin } from "../middleware/auth";
import { createEmployeeSchema, updateEmployeeSchema } from "../validators/employee.validators";
import { selectShiftSchema } from "../validators/shift.validators";
import { serializeEmployee } from "../lib/serialize";
import { hashPassword } from "../lib/password";
import { badRequest, conflict, notFound } from "../lib/errors";

const router = Router();
router.use(requireAuth);

// looks up a shift belonging to this org and returns the workStart/workEnd/shiftId fields
// to merge into an employee update — shiftId picks the times, not the other way around
const resolveShiftTimes = async (shiftId: string, organizationId: string) => {
  const shift = await prisma.shift.findFirst({ where: { id: shiftId, organizationId } });
  if (!shift) throw notFound("กะการทำงาน");
  return { shiftId: shift.id, workStart: shift.startTime, workEnd: shift.endTime };
};

// employees pick their own shift from the org's presets (e.g. switching from a morning to
// an afternoon shift mid-month) — this is the only self-service write on the employee row
router.put(
  "/me/shift",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const { shiftId } = selectShiftSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const shiftTimes = await resolveShiftTimes(shiftId, organizationId);
    const updated = await prisma.employee.update({
      where: { id: req.user!.id },
      data: shiftTimes,
    });
    res.json(serializeEmployee(updated));
  })
);

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
    const shiftTimes = input.shiftId ? await resolveShiftTimes(input.shiftId, organizationId) : null;
    const employee = await prisma.employee.create({
      data: {
        organizationId,
        name: input.name,
        position: input.position,
        baseSalary: input.baseSalary,
        workStart: shiftTimes?.workStart ?? input.workStart,
        workEnd: shiftTimes?.workEnd ?? input.workEnd,
        shiftId: shiftTimes?.shiftId,
        daysOff: input.daysOff,
        hireDate: input.hireDate,
        socialSecurityRate: input.socialSecurityRate,
        wageType: input.wageType,
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
    // shiftId: string -> adopt that shift's times; null -> detach (keep workStart/workEnd as
    // given/unchanged); undefined -> no change to either field
    const shiftTimes = input.shiftId ? await resolveShiftTimes(input.shiftId, organizationId) : null;
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        name: input.name,
        position: input.position,
        baseSalary: input.baseSalary,
        workStart: shiftTimes?.workStart ?? input.workStart,
        workEnd: shiftTimes?.workEnd ?? input.workEnd,
        shiftId: shiftTimes ? shiftTimes.shiftId : input.shiftId,
        daysOff: input.daysOff,
        hireDate: input.hireDate,
        socialSecurityRate: input.socialSecurityRate,
        wageType: input.wageType,
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
