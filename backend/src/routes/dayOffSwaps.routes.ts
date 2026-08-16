import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  createDayOffSwapSchema,
  dayOffSwapStatusSchema,
  dayOffSwapQuerySchema,
} from "../validators/dayOffSwap.validators";
import { serializeDayOffSwap } from "../lib/serialize";
import { badRequest, conflict, notFound } from "../lib/errors";
import { isWeeklyDayOff } from "../lib/payroll";
import { todayStrBangkok } from "../lib/thaiTime";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const input = createDayOffSwapSchema.parse(req.body);
    const today = todayStrBangkok();
    if (input.originalOffDate < today || input.swappedToDate < today) {
      throw badRequest("ไม่สามารถขอสลับวันหยุดที่ผ่านไปแล้วได้");
    }

    const emp = await prisma.employee.findFirst({
      where: { id: req.user!.id, organizationId: req.user!.organizationId },
    });
    if (!emp || !emp.active) throw notFound("พนักงาน");

    if (!isWeeklyDayOff(emp, input.originalOffDate)) {
      throw badRequest("วันที่เลือกไม่ใช่วันหยุดประจำสัปดาห์ของคุณ");
    }
    if (isWeeklyDayOff(emp, input.swappedToDate)) {
      throw badRequest("วันที่ขอสลับมาต้องเป็นวันทำงานปกติ ไม่ใช่วันหยุดอยู่แล้ว");
    }

    const existing = await prisma.dayOffSwapRequest.findFirst({
      where: { employeeId: emp.id, originalOffDate: input.originalOffDate, status: { in: ["PENDING", "APPROVED"] } },
    });
    if (existing) throw conflict("มีคำขอสลับวันหยุดสำหรับวันนี้อยู่แล้ว");

    const swap = await prisma.dayOffSwapRequest.create({
      data: {
        organizationId: emp.organizationId,
        employeeId: emp.id,
        originalOffDate: input.originalOffDate,
        swappedToDate: input.swappedToDate,
        reason: input.reason,
        status: "PENDING",
      },
    });
    res.status(201).json(serializeDayOffSwap(swap));
  })
);

router.get(
  "/me",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const swaps = await prisma.dayOffSwapRequest.findMany({
      where: { employeeId: req.user!.id, organizationId: req.user!.organizationId },
      orderBy: { originalOffDate: "desc" },
    });
    res.json(swaps.map(serializeDayOffSwap));
  })
);

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { employeeId, status } = dayOffSwapQuerySchema.parse(req.query);
    const swaps = await prisma.dayOffSwapRequest.findMany({
      where: {
        organizationId: req.user!.organizationId,
        employeeId: employeeId ?? undefined,
        status: status ?? undefined,
      },
      orderBy: { originalOffDate: "desc" },
    });
    res.json(swaps.map(serializeDayOffSwap));
  })
);

router.patch(
  "/:id/status",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { status } = dayOffSwapStatusSchema.parse(req.body);
    const swap = await prisma.dayOffSwapRequest.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!swap) throw notFound("คำขอสลับวันหยุด");
    const updated = await prisma.dayOffSwapRequest.update({ where: { id: swap.id }, data: { status } });
    res.json(serializeDayOffSwap(updated));
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const swap = await prisma.dayOffSwapRequest.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!swap) throw notFound("คำขอสลับวันหยุด");
    await prisma.dayOffSwapRequest.delete({ where: { id: swap.id } });
    res.status(204).send();
  })
);

export default router;
