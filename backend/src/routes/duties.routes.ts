import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  dutyQuerySchema,
  createDutyTaskOptionSchema,
  updateDutyTaskOptionSchema,
  setDutyScheduleRuleSchema,
  setDutyAssignmentSchema,
} from "../validators/duty.validators";
import { serializeDutyAssignment, serializeDutyTaskOption, serializeDutyScheduleRule } from "../lib/serialize";
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

// Weekly recurring rule: "every Monday, employee X always gets task Y" — checked at
// check-in before falling back to the random pool. Any weekday left without a rule stays
// random (or unassigned, if the employee has dutyRotationEnabled off).
router.get(
  "/schedule",
  asyncHandler(async (req, res) => {
    const rules = await prisma.dutyScheduleRule.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { taskOption: true },
      orderBy: [{ employeeId: "asc" }, { weekday: "asc" }],
    });
    res.json(rules.map(serializeDutyScheduleRule));
  })
);

router.put(
  "/schedule",
  asyncHandler(async (req, res) => {
    const input = setDutyScheduleRuleSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const [employee, task] = await Promise.all([
      prisma.employee.findFirst({ where: { id: input.employeeId, organizationId } }),
      prisma.dutyTaskOption.findFirst({ where: { id: input.taskId, organizationId } }),
    ]);
    if (!employee) throw notFound("พนักงาน");
    if (!task) throw notFound("หน้าที่");

    const rule = await prisma.dutyScheduleRule.upsert({
      where: { employeeId_weekday: { employeeId: input.employeeId, weekday: input.weekday } },
      create: { organizationId, employeeId: input.employeeId, weekday: input.weekday, taskId: input.taskId },
      update: { taskId: input.taskId },
      include: { taskOption: true },
    });
    res.json(serializeDutyScheduleRule(rule));
  })
);

// removes the rule for that weekday — the weekday goes back to random (or unassigned)
router.delete(
  "/schedule/:id",
  asyncHandler(async (req, res) => {
    const rule = await prisma.dutyScheduleRule.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!rule) throw notFound("กำหนดการ");
    await prisma.dutyScheduleRule.delete({ where: { id: rule.id } });
    res.status(204).send();
  })
);

// one-off override for a single specific date — takes priority over both the weekly
// schedule and random, since check-in only assigns randomly when no DutyAssignment row
// exists yet for that employee+date. Upsert so re-submitting the same date just changes it.
router.put(
  "/assignments",
  asyncHandler(async (req, res) => {
    const input = setDutyAssignmentSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const [employee, task] = await Promise.all([
      prisma.employee.findFirst({ where: { id: input.employeeId, organizationId } }),
      prisma.dutyTaskOption.findFirst({ where: { id: input.taskId, organizationId } }),
    ]);
    if (!employee) throw notFound("พนักงาน");
    if (!task) throw notFound("หน้าที่");

    const assignment = await prisma.dutyAssignment.upsert({
      where: { employeeId_date: { employeeId: input.employeeId, date: input.date } },
      create: { organizationId, employeeId: input.employeeId, date: input.date, taskId: input.taskId },
      update: { taskId: input.taskId },
      include: { taskOption: true },
    });
    res.status(201).json(serializeDutyAssignment(assignment));
  })
);

export default router;
