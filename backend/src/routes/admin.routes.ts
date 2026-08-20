import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { changePasswordSchema, setAdminEmailSchema } from "../validators/auth.validators";
import { hashPassword, verifyPassword } from "../lib/password";
import { unauthorized } from "../lib/errors";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const workplaceLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(10).max(5000),
  enabled: z.boolean(),
});

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.user!.id } });
    const org = await prisma.organization.findUnique({ where: { id: req.user!.organizationId } });
    res.json({
      id: admin?.id,
      username: admin?.username,
      email: admin?.email ?? null,
      organization: org ? { id: org.id, name: org.name, slug: org.slug } : null,
    });
  })
);

router.patch(
  "/email",
  asyncHandler(async (req, res) => {
    const { email } = setAdminEmailSchema.parse(req.body);
    await prisma.admin.update({ where: { id: req.user!.id }, data: { email } });
    res.json({ email });
  })
);

router.patch(
  "/password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { id: req.user!.id } });
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw unauthorized("รหัสผ่านเดิมไม่ถูกต้อง");
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

router.get(
  "/location",
  asyncHandler(async (req, res) => {
    const loc = await prisma.workplaceLocation.findUnique({ where: { organizationId: req.user!.organizationId } });
    res.json(
      loc
        ? { lat: Number(loc.lat), lng: Number(loc.lng), radiusMeters: loc.radiusMeters, enabled: loc.enabled }
        : null
    );
  })
);

router.put(
  "/location",
  asyncHandler(async (req, res) => {
    const { lat, lng, radiusMeters, enabled } = workplaceLocationSchema.parse(req.body);
    const organizationId = req.user!.organizationId;
    const loc = await prisma.workplaceLocation.upsert({
      where: { organizationId },
      create: { organizationId, lat, lng, radiusMeters, enabled },
      update: { lat, lng, radiusMeters, enabled },
    });
    res.json({ lat: Number(loc.lat), lng: Number(loc.lng), radiusMeters: loc.radiusMeters, enabled: loc.enabled });
  })
);

export default router;
