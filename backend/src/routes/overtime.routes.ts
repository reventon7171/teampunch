import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { createOvertimeSchema, overtimeStatusSchema, overtimeQuerySchema } from "../validators/overtime.validators";
import { serializeOvertime } from "../lib/serialize";
import { overtimeDurationHours } from "../lib/payroll";
import { badRequest, notFound } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const input = createOvertimeSchema.parse(req.body);
    const hours = overtimeDurationHours(input.startTime, input.endTime);
    if (hours <= 0 || hours > 24) throw badRequest("ช่วงเวลา OT ไม่ถูกต้อง");

    const overtime = await prisma.overtimeRequest.create({
      data: {
        organizationId: req.user!.organizationId,
        employeeId: req.user!.id,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        hours,
        reason: input.reason,
        status: "PENDING",
      },
    });

    res.status(201).json(serializeOvertime(overtime));
  })
);

router.get(
  "/me",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const overtimeRequests = await prisma.overtimeRequest.findMany({
      where: { employeeId: req.user!.id, organizationId: req.user!.organizationId },
      orderBy: { date: "desc" },
    });
    res.json(overtimeRequests.map(serializeOvertime));
  })
);

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { employeeId, status } = overtimeQuerySchema.parse(req.query);
    const overtimeRequests = await prisma.overtimeRequest.findMany({
      where: {
        organizationId: req.user!.organizationId,
        employeeId: employeeId ?? undefined,
        status: status ?? undefined,
      },
      orderBy: { date: "desc" },
    });
    res.json(overtimeRequests.map(serializeOvertime));
  })
);

router.patch(
  "/:id/status",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { status } = overtimeStatusSchema.parse(req.body);
    const overtime = await prisma.overtimeRequest.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!overtime) throw notFound("คำขอ OT");
    const updated = await prisma.overtimeRequest.update({ where: { id: overtime.id }, data: { status } });
    res.json(serializeOvertime(updated));
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const overtime = await prisma.overtimeRequest.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!overtime) throw notFound("คำขอ OT");
    await prisma.overtimeRequest.delete({ where: { id: overtime.id } });
    res.status(204).send();
  })
);

export default router;
