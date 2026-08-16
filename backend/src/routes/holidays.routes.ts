import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { createHolidaySchema } from "../validators/holiday.validators";
import { serializeHoliday } from "../lib/serialize";
import { conflict, notFound } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const holidays = await prisma.holiday.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: { date: "asc" },
    });
    res.json(holidays.map(serializeHoliday));
  })
);

router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = createHolidaySchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const existing = await prisma.holiday.findUnique({
      where: { organizationId_date: { organizationId, date: input.date } },
    });
    if (existing) throw conflict("มีวันหยุดของวันนี้อยู่แล้ว");
    const holiday = await prisma.holiday.create({ data: { ...input, organizationId } });
    res.status(201).json(serializeHoliday(holiday));
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const holiday = await prisma.holiday.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!holiday) throw notFound("วันหยุด");
    await prisma.holiday.delete({ where: { id: holiday.id } });
    res.status(204).send();
  })
);

export default router;
