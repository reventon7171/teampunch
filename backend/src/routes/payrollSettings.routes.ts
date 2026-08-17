import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { updatePayrollSettingsSchema } from "../validators/payrollSettings.validators";
import { serializePayrollConfig } from "../lib/serialize";

const router = Router();
router.use(requireAuth);

// readable by both roles — employees need this to render their own pay-period navigation
// (MyPayrollScreen), not just admins
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: req.user!.organizationId } });
    res.json(serializePayrollConfig(org));
  })
);

router.put(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const input = updatePayrollSettingsSchema.parse(req.body);
    const org = await prisma.organization.update({
      where: { id: req.user!.organizationId },
      data: input,
    });
    res.json(serializePayrollConfig(org));
  })
);

export default router;
