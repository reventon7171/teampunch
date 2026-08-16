import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload, randomPhotoKey } from "../lib/upload";
import { savePhoto, readPhoto } from "../lib/storage";
import { createLeaveSchema, leaveStatusSchema, leaveQuerySchema } from "../validators/leave.validators";
import { serializeLeave } from "../lib/serialize";
import { notFound, forbidden } from "../lib/errors";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  requireRole("employee"),
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const input = createLeaveSchema.parse(req.body);
    const organizationId = req.user!.organizationId;

    let photoKey: string | undefined;
    if (req.file) {
      photoKey = randomPhotoKey(`org/${organizationId}/emp/${req.user!.id}/leave`, req.file.mimetype);
      await savePhoto(photoKey, req.file.buffer, req.file.mimetype);
    }

    const leave = await prisma.leave.create({
      data: {
        organizationId,
        employeeId: req.user!.id,
        date: input.date,
        type: input.type,
        reason: input.reason,
        photoPath: photoKey,
        status: "PENDING",
      },
    });

    res.status(201).json(serializeLeave(leave));
  })
);

router.get(
  "/me",
  requireRole("employee"),
  asyncHandler(async (req, res) => {
    const leaves = await prisma.leave.findMany({
      where: { employeeId: req.user!.id, organizationId: req.user!.organizationId },
      orderBy: { date: "desc" },
    });
    res.json(leaves.map(serializeLeave));
  })
);

router.get(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { employeeId, status } = leaveQuerySchema.parse(req.query);
    const leaves = await prisma.leave.findMany({
      where: {
        organizationId: req.user!.organizationId,
        employeeId: employeeId ?? undefined,
        status: status ?? undefined,
      },
      orderBy: { date: "desc" },
    });
    res.json(leaves.map(serializeLeave));
  })
);

router.patch(
  "/:id/status",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { status } = leaveStatusSchema.parse(req.body);
    const leave = await prisma.leave.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!leave) throw notFound("คำขอลา");
    const updated = await prisma.leave.update({ where: { id: leave.id }, data: { status } });
    res.json(serializeLeave(updated));
  })
);

router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const leave = await prisma.leave.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!leave) throw notFound("คำขอลา");
    await prisma.leave.delete({ where: { id: leave.id } });
    res.status(204).send();
  })
);

router.get(
  "/:id/photo",
  asyncHandler(async (req, res) => {
    const leave = await prisma.leave.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });
    if (!leave) throw notFound("คำขอลา");
    if (req.user!.role !== "admin" && req.user!.id !== leave.employeeId) throw forbidden();
    if (!leave.photoPath) throw notFound("รูปเอกสาร");

    const photo = await readPhoto(leave.photoPath);
    if (!photo) throw notFound("รูปเอกสาร");
    if (photo.contentType) res.type(photo.contentType);
    photo.stream.pipe(res);
  })
);

export default router;
