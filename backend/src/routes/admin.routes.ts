import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { changePasswordSchema, setAdminEmailSchema, deleteAccountSchema, pushTokenSchema } from "../validators/auth.validators";
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

// Deletes this admin's entire business account — the whole Organization and everything
// under it (other admins, employees, attendance, leaves, payroll records, ...) via the
// cascading FKs on Organization. Irreversible.
router.delete(
  "/account",
  asyncHandler(async (req, res) => {
    const { currentPassword } = deleteAccountSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { id: req.user!.id } });
    if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
      throw unauthorized("รหัสผ่านไม่ถูกต้อง");
    }
    await prisma.organization.delete({ where: { id: req.user!.organizationId } });
    res.json({ ok: true });
  })
);

// Registers this device for push notifications (new leave/OT/day-off-swap requests). `token`
// is globally unique in the table, not scoped per-admin, so re-registering the same physical
// device under a different admin (e.g. after logging out and into another account on it)
// moves the row to the new owner instead of erroring.
router.put(
  "/push-token",
  asyncHandler(async (req, res) => {
    const { token } = pushTokenSchema.parse(req.body);
    await prisma.adminPushToken.upsert({
      where: { token },
      create: { token, adminId: req.user!.id },
      update: { adminId: req.user!.id },
    });
    res.json({ ok: true });
  })
);

// Called on logout so a shared/reset device stops receiving this admin's notifications.
// Silently no-ops if the token was already removed (e.g. by Expo's DeviceNotRegistered prune).
router.delete(
  "/push-token",
  asyncHandler(async (req, res) => {
    const { token } = pushTokenSchema.parse(req.body);
    await prisma.adminPushToken.deleteMany({ where: { token, adminId: req.user!.id } });
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
