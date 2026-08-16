import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { dutyQuerySchema, createDutyTaskOptionSchema, updateDutyTaskOptionSchema } from "../validators/duty.validators";
import { serializeDutyAssignment, serializeDutyTaskOption } from "../lib/serialize";
import { conflict, notFound } from "../lib/errors";

const router = Router();
router.use(requireAuth, requireRole("admin"));

// history of who was assigned which cleaning duty on which day — lets an admin look back
// if something wasn't done properly
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { employeeId, from, to } = dutyQuerySchema.parse(req.query);
    const assignments = await prisma.dutyAssignment.findMany({
      where: {
        organizationId: req.user!.organizationId,
        employeeId: employeeId ?? undefined,
        date: { gte: from ?? undefined, lte: to ?? undefined },
      },
      include: { taskOption: true },
      orderBy: { date: "desc" },
    });
    res.json(assignments.map(serializeDutyAssignment));
  })
);

// admin-managed list of possible daily duties — a random ACTIVE one is assigned at
// check-in to any employee with dutyRotationEnabled=true
router.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const tasks = await prisma.dutyTaskOption.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    res.json(tasks.map(serializeDutyTaskOption));
  })
);

router.post(
  "/tasks",
  asyncHandler(async (req, res) => {
    const { label } = createDutyTaskOptionSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const existing = await prisma.dutyTaskOption.findUnique({
      where: { organizationId_label: { organizationId, label } },
    });
    if (existing) throw conflict("มีหน้าที่นี้อยู่แล้ว");
    const task = await prisma.dutyTaskOption.create({ data: { label, organizationId } });
    res.status(201).json(serializeDutyTaskOption(task));
  })
);

// deactivate/reactivate only — never hard-deleted, since past DutyAssignment rows
// reference it and must keep showing a real label in history
router.patch(
  "/tasks/:id",
  asyncHandler(async (req, res) => {
    const { active } = updateDutyTaskOptionSchema.parse(req.body);
    const existing = await prisma.dutyTaskOption.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!existing) throw notFound("หน้าที่");
    const task = await prisma.dutyTaskOption.update({ where: { id: existing.id }, data: { active } });
    res.json(serializeDutyTaskOption(task));
  })
);

export default router;
