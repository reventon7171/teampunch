import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { upsertShiftSchema } from "../validators/shift.validators";
import { serializeShift } from "../lib/serialize";
import { conflict, notFound } from "../lib/errors";

const MAX_SHIFTS_PER_ORG = 3;

const router = Router();
router.use(requireAuth);

// readable by both roles — employees need the list to pick a shift for themselves
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const shifts = await prisma.shift.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    res.json(shifts.map(serializeShift));
  })
);

router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = upsertShiftSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const count = await prisma.shift.count({ where: { organizationId } });
    if (count >= MAX_SHIFTS_PER_ORG) {
      throw conflict(`สร้างกะได้สูงสุด ${MAX_SHIFTS_PER_ORG} กะต่อกิจการ`);
    }
    const shift = await prisma.shift.create({ data: { organizationId, ...input } });
    res.status(201).json(serializeShift(shift));
  })
);

router.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = upsertShiftSchema.partial().parse(req.body);
    const organizationId = req.user!.organizationId;
    const shift = await prisma.shift.findFirst({ where: { id: req.params.id, organizationId } });
    if (!shift) throw notFound("กะการทำงาน");
    const updated = await prisma.shift.update({ where: { id: shift.id }, data: input });
    res.json(serializeShift(updated));
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const shift = await prisma.shift.findFirst({ where: { id: req.params.id, organizationId } });
    if (!shift) throw notFound("กะการทำงาน");
    // employees referencing this shift keep their current workStart/workEnd (already copied
    // onto their own row) — only the shiftId link is cleared (onDelete: SetNull)
    await prisma.shift.delete({ where: { id: shift.id } });
    res.status(204).send();
  })
);

export default router;
